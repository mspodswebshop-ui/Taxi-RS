-- VehicleService: voertuigen spawnen, instappen en besturen.
-- Besturen: W/S (of pijltjes) = gas/remmen, A/D = sturen. Springen = uitstappen.

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = require(Shared.Config)
local Remotes = require(Shared.Remotes)
local VehicleBuilder = require(script.Parent.VehicleBuilder)

local VehicleService = {}

type VehicleState = {
	Model: Model,
	Root: BasePart,
	Seat: VehicleSeat,
	Def: any,
	Speed: number,
	Linear: LinearVelocity,
	Angular: AngularVelocity,
	Owner: Player,
}

local folder: Folder
local vehicles: { [Player]: VehicleState } = {}
local world: any
local roleService: any
local monetization: any

local ACCELERATION = 35 -- studs per seconde^2
local BRAKE = 70
local TURN_SPEED = 1.8 -- radialen per seconde

function VehicleService.Despawn(player: Player)
	local state = vehicles[player]
	if state then
		vehicles[player] = nil
		state.Model:Destroy()
	end
end

local function notify(player: Player, text: string)
	Remotes.Event("Notify"):FireClient(player, text)
end

-- Zoek een plek voor de auto vlak bij de speler, anders bij de garage.
local function findSpawn(player: Player, size: Vector3): CFrame
	local character = player.Character
	local root = character and character:FindFirstChild("HumanoidRootPart") :: BasePart?
	if root then
		local look = root.CFrame.LookVector
		local flat = Vector3.new(look.X, 0, look.Z)
		if flat.Magnitude > 0.01 then
			flat = flat.Unit
			local pos = root.Position + flat * 12
			local params = RaycastParams.new()
			params.FilterDescendantsInstances = { character, folder }
			local hit = Workspace:Raycast(pos + Vector3.new(0, 10, 0), Vector3.new(0, -30, 0), params)
			if hit then
				local cf = CFrame.lookAt(hit.Position, hit.Position + flat)
				local overlap = OverlapParams.new()
				overlap.FilterDescendantsInstances = { character, folder, world.Ground }
				local blocking = Workspace:GetPartBoundsInBox(cf + Vector3.new(0, size.Y / 2 + 1, 0), size, overlap)
				if #blocking == 0 then
					return cf
				end
			end
		end
	end
	local pads = world.VehiclePads
	return pads[math.random(1, #pads)]
end

function VehicleService.Spawn(player: Player, vehicleId: string, colorName: string?)
	local def = Config.GetVehicle(vehicleId)
	if not def then
		return
	end
	if player:GetAttribute("JailedUntil") then
		notify(player, "Je zit in de cel!")
		return
	end
	if def.Role and roleService.GetRole(player) ~= def.Role then
		notify(player, "Alleen voor de rol: " .. def.Role)
		return
	end
	if def.GamePass and not monetization.Owns(player, def.GamePass) then
		notify(player, "Hiervoor heb je de gamepass " .. def.GamePass .. " nodig.")
		return
	end

	VehicleService.Despawn(player)

	local character = player.Character
	local humanoid = character and character:FindFirstChildOfClass("Humanoid")
	if humanoid and humanoid.SeatPart then
		humanoid.Sit = false
	end

	-- Bouw eerst op een veilige plek om de grootte te weten
	local model = VehicleBuilder.Build(def, Config.GetColor(colorName), CFrame.new(0, -500, 0), true)
	local _, size = model:GetBoundingBox()
	local cf = findSpawn(player, size)
	-- Het model staat nu met zijn grondpunt op (0, -500, 0): verplaats het naar cf
	local offset = CFrame.new(0, 500, 0) * (model.PrimaryPart :: BasePart).CFrame
	model:PivotTo(cf * CFrame.new(0, 0.5, 0) * offset)
	model.Name = player.Name .. "_" .. def.Id
	model:SetAttribute("OwnerUserId", player.UserId)

	local root = model.PrimaryPart :: BasePart
	local seat = model:FindFirstChild("DriverSeat") :: VehicleSeat

	local attachment = Instance.new("Attachment")
	attachment.Name = "DriveAttachment"
	attachment.Parent = root

	-- Sterk genoeg om snel op te trekken, niet zo sterk dat de auto alles wegduwt
	local force = 60000
	local linear = Instance.new("LinearVelocity")
	linear.Attachment0 = attachment
	linear.RelativeTo = Enum.ActuatorRelativeTo.World
	linear.VelocityConstraintMode = Enum.VelocityConstraintMode.Vector
	linear.ForceLimitMode = Enum.ForceLimitMode.PerAxis
	linear.MaxAxesForce = Vector3.new(force, 0, force)
	linear.VectorVelocity = Vector3.zero
	linear.Parent = root

	local angular = Instance.new("AngularVelocity")
	angular.Attachment0 = attachment
	angular.RelativeTo = Enum.ActuatorRelativeTo.World
	angular.MaxTorque = 400000
	angular.AngularVelocity = Vector3.zero
	angular.Parent = root

	-- "Instappen"-knop: zet je op de eerste vrije stoel
	local prompt = Instance.new("ProximityPrompt")
	prompt.ActionText = "Instappen"
	prompt.ObjectText = def.Name
	prompt.MaxActivationDistance = 12
	prompt.RequiresLineOfSight = false
	prompt.Parent = root
	prompt.Triggered:Connect(function(who)
		local hum = who.Character and who.Character:FindFirstChildOfClass("Humanoid")
		if not hum or hum.SeatPart then
			return
		end
		local seats = { seat }
		for _, s in model:GetChildren() do
			if s.Name == "PassengerSeat" then
				table.insert(seats, s)
			end
		end
		for _, s in seats do
			local free = (s :: any).Occupant == nil
			-- alleen de eigenaar mag rijden
			if free and (s ~= seat or who == player) then
				(s :: any):Sit(hum)
				return
			end
		end
	end)

	model.Parent = folder
	for _, part in model:GetDescendants() do
		if part:IsA("BasePart") then
			part.Anchored = false
		end
	end

	local state: VehicleState = {
		Model = model,
		Root = root,
		Seat = seat,
		Def = def,
		Speed = 0,
		Linear = linear,
		Angular = angular,
		Owner = player,
	}
	vehicles[player] = state

	-- De bestuurder krijgt de natuurkunde, dan rijdt het soepel
	seat:GetPropertyChangedSignal("Occupant"):Connect(function()
		if not root:IsDescendantOf(Workspace) then
			return
		end
		local occupant = seat.Occupant
		local driver = occupant and Players:GetPlayerFromCharacter(occupant.Parent)
		pcall(function()
			if driver then
				root:SetNetworkOwner(driver)
			else
				root:SetNetworkOwnershipAuto()
			end
		end)
	end)

	if humanoid then
		task.wait(0.2)
		if seat.Parent and not humanoid.SeatPart then
			seat:Sit(humanoid)
		end
	end
end

local sirenTimer = 0
local function step(dt: number)
	sirenTimer += dt
	local sirenOn = (sirenTimer % 0.5) < 0.25

	for player, state in vehicles do
		if not state.Model.Parent then
			vehicles[player] = nil
			continue
		end
		local seat = state.Seat
		local driving = seat.Occupant ~= nil
		local throttle = driving and seat.ThrottleFloat or 0
		local steer = driving and seat.SteerFloat or 0
		local max = state.Def.MaxSpeed

		local target = throttle > 0 and throttle * max or throttle * max * 0.4
		local rate = ACCELERATION
		if target == 0 or (target > 0) ~= (state.Speed > 0) then
			rate = BRAKE
		end
		local diff = target - state.Speed
		state.Speed += math.clamp(diff, -rate * dt, rate * dt)

		local look = state.Root.CFrame.LookVector
		local flat = Vector3.new(look.X, 0, look.Z)
		if flat.Magnitude > 0.05 then
			state.Linear.VectorVelocity = flat.Unit * state.Speed
		end

		local grip = math.clamp(math.abs(state.Speed) / 12, 0, 1)
		local direction = state.Speed >= 0 and 1 or -1
		state.Angular.AngularVelocity = Vector3.new(0, -steer * TURN_SPEED * grip * direction, 0)

		-- zwaailichten
		local red = state.Model:FindFirstChild("SirenRed") :: BasePart?
		local blue = state.Model:FindFirstChild("SirenBlue") :: BasePart?
		if red and blue then
			local on = driving
			red.Transparency = (on and not sirenOn) and 0.7 or 0
			blue.Transparency = (on and sirenOn) and 0.7 or 0
			local redLight = red:FindFirstChildOfClass("PointLight")
			local blueLight = blue:FindFirstChildOfClass("PointLight")
			if redLight and blueLight then
				redLight.Enabled = on and sirenOn
				blueLight.Enabled = on and not sirenOn
			end
		end
	end
end

function VehicleService.Init(worldInfo: any, roles: any, money: any)
	world = worldInfo
	roleService = roles
	monetization = money

	folder = Instance.new("Folder")
	folder.Name = "Vehicles"
	folder.Parent = Workspace

	Remotes.Event("SpawnVehicle").OnServerEvent:Connect(function(player, vehicleId, colorName)
		if typeof(vehicleId) ~= "string" then
			return
		end
		if typeof(colorName) ~= "string" then
			colorName = nil
		end
		VehicleService.Spawn(player, vehicleId, colorName)
	end)
	Remotes.Event("DespawnVehicle").OnServerEvent:Connect(function(player)
		VehicleService.Despawn(player)
	end)

	Players.PlayerRemoving:Connect(VehicleService.Despawn)
	RunService.Heartbeat:Connect(step)
end

return VehicleService
