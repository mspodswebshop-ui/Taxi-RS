-- PoliceService: de politie kan spelers met de rol "Boef" arresteren.
-- Een gearresteerde boef zit even in de cel van het politiebureau.

local Players = game:GetService("Players")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = require(Shared.Config)
local Remotes = require(Shared.Remotes)

local PoliceService = {}

local function rootOf(player: Player): BasePart?
	local character = player.Character
	return character and character:FindFirstChild("HumanoidRootPart") :: BasePart?
end

local function teleport(player: Player, cf: CFrame)
	local character = player.Character
	if not character then
		return
	end
	local humanoid = character:FindFirstChildOfClass("Humanoid")
	if humanoid and humanoid.SeatPart then
		humanoid.Sit = false
		task.wait()
	end
	character:PivotTo(cf + Vector3.new(0, 3, 0))
end

function PoliceService.Init(roleService: any, world: any, vehicleService: any)
	local nextCell = 0

	Remotes.Event("Arrest").OnServerEvent:Connect(function(officer, target)
		if typeof(target) ~= "Instance" or not target:IsA("Player") or target == officer then
			return
		end
		if roleService.GetRole(officer) ~= "Politie" then
			return
		end
		if roleService.GetRole(target) ~= "Boef" then
			Remotes.Event("Notify"):FireClient(officer, "Je kunt alleen boeven arresteren.")
			return
		end
		if target:GetAttribute("JailedUntil") then
			return
		end
		local a, b = rootOf(officer), rootOf(target)
		if not a or not b or (a.Position - b.Position).Magnitude > Config.ArrestDistance then
			return
		end

		vehicleService.Despawn(target)
		-- gestolen geld afpakken
		target:SetAttribute("Wanted", nil)
		for _, container in { target:FindFirstChildOfClass("Backpack"), target.Character } do
			local bag = container and container:FindFirstChild("Geldzak")
			if bag then
				bag:Destroy()
			end
		end
		nextCell = nextCell % #world.JailCells + 1
		target:SetAttribute("JailedUntil", os.time() + Config.JailTime)
		teleport(target, world.JailCells[nextCell])

		Remotes.Event("Notify"):FireClient(officer, "Je hebt " .. target.DisplayName .. " gearresteerd! 🚔")
		Remotes.Event("Notify"):FireClient(target, "Je bent gearresteerd! Je zit " .. Config.JailTime .. " seconden in de cel.")
	end)

	-- Laat boeven vrij als hun tijd om is
	task.spawn(function()
		while true do
			task.wait(1)
			for _, player in Players:GetPlayers() do
				local untilTime = player:GetAttribute("JailedUntil")
				if untilTime and os.time() >= untilTime then
					player:SetAttribute("JailedUntil", nil)
					teleport(player, world.JailExit)
					Remotes.Event("Notify"):FireClient(player, "Je bent weer vrij. Gedraag je!")
				end
			end
		end
	end)

	-- Wie in de cel zit en respawnt, gaat terug de cel in
	local function onPlayer(player: Player)
		player.CharacterAdded:Connect(function(character)
			if player:GetAttribute("JailedUntil") then
				character:WaitForChild("HumanoidRootPart")
				task.wait()
				teleport(player, world.JailCells[1])
			end
		end)
	end
	Players.PlayerAdded:Connect(onPlayer)
	for _, player in Players:GetPlayers() do
		onPlayer(player)
	end
end

return PoliceService
