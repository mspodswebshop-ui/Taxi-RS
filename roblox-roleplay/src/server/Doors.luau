-- Doors: deuren die echt opengaan.
--   Swing  = draaideur (huisdeur), opent met E
--   Slide  = schuifdeur (glas), opent met E
--   Double = automatische schuifdeuren (winkels), openen vanzelf als je eraan komt
--   Up     = garagedeur, schuift omhoog met E
-- Een deur die op slot zit, kan alleen de eigenaar openen.

local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")

local Build = require(script.Parent.Build)

local Doors = {}

export type Door = {
	Leaves: { BasePart },
	Closed: { CFrame },
	Opened: { CFrame },
	Open: boolean,
	Locked: boolean,
	OwnerUserId: number,
	Center: Vector3,
	Prompt: ProximityPrompt?,
}

local autoDoors: { Door } = {}
local notify: ((Player, string) -> ())? = nil
local TWEEN = TweenInfo.new(0.45, Enum.EasingStyle.Quad, Enum.EasingDirection.Out)

function Doors.SetNotifier(fn: (Player, string) -> ())
	notify = fn
end

function Doors.SetOpen(door: Door, open: boolean)
	if door.Open == open then
		return
	end
	door.Open = open
	for i, leaf in door.Leaves do
		TweenService:Create(leaf, TWEEN, { CFrame = open and door.Opened[i] or door.Closed[i] }):Play()
	end
	if door.Prompt then
		door.Prompt.ActionText = open and "Sluiten" or "Openen"
	end
end

function Doors.SetLocked(door: Door, locked: boolean)
	door.Locked = locked
	if locked then
		Doors.SetOpen(door, false)
	end
end

function Doors.SetOwner(door: Door, userId: number)
	door.OwnerUserId = userId
end

local function leaf(parent: Instance, cf: CFrame, size: Vector3, opts: any): Part
	local part: Part
	if opts.Glass then
		part = Build.Glass(parent, cf, size)
		part.Transparency = 0.35
	else
		part = Build.Box(parent, cf, size, opts.Color or Color3.fromRGB(90, 60, 40), opts.Material or Enum.Material.Wood)
	end
	part.Name = "DoorLeaf"
	-- handvat (beweegt mee)
	local handle = Instance.new("Part")
	handle.Name = "Handle"
	handle.Size = Vector3.new(0.25, opts.Glass and 2.5 or 0.4, 0.9)
	handle.Color = Color3.fromRGB(190, 190, 200)
	handle.Material = Enum.Material.Metal
	handle.CanCollide = false
	handle.Massless = true
	handle.CFrame = cf * CFrame.new(size.X / 2 - 0.6, -0.4, 0)
	local weld = Instance.new("WeldConstraint")
	weld.Part0 = part
	weld.Part1 = handle
	weld.Parent = handle
	handle.Parent = part
	return part
end

-- cf = midden van de deuropening op vloerhoogte, voorkant (-Z) = buitenkant.
function Doors.Create(parent: Instance, cf: CFrame, width: number, height: number, opts: any): Door
	local style = opts.Style or "Swing"
	local door: Door = {
		Leaves = {},
		Closed = {},
		Opened = {},
		Open = false,
		Locked = false,
		OwnerUserId = 0,
		Center = (cf * CFrame.new(0, height / 2, 0)).Position,
		Prompt = nil,
	}

	local function add(part: BasePart, opened: CFrame)
		table.insert(door.Leaves, part)
		table.insert(door.Closed, part.CFrame)
		table.insert(door.Opened, opened)
	end

	local mid = cf * CFrame.new(0, height / 2, 0)
	if style == "Double" then
		local half = width / 2
		for _, side in { -1, 1 } do
			local closed = mid * CFrame.new(side * half / 2, 0, 0)
			local p = leaf(parent, closed, Vector3.new(half - 0.05, height - 0.05, 0.3), opts)
			add(p, closed * CFrame.new(side * (half - 0.4), 0, 0))
		end
		table.insert(autoDoors, door)
	elseif style == "Slide" then
		local p = leaf(parent, mid, Vector3.new(width - 0.05, height - 0.05, 0.3), opts)
		add(p, mid * CFrame.new((width - 0.6) * (opts.SlideDir or 1), 0, 0))
	elseif style == "Up" then
		local p = leaf(parent, mid, Vector3.new(width - 0.05, height - 0.05, 0.3), opts)
		-- garagedeur-ribbels
		for i = 1, 4 do
			local rib = Instance.new("Part")
			rib.Size = Vector3.new(width - 0.3, 0.15, 0.1)
			rib.Color = Color3.fromRGB(200, 200, 205)
			rib.CanCollide = false
			rib.Massless = true
			rib.CFrame = mid * CFrame.new(0, -height / 2 + i * height / 5, -0.18)
			local weld = Instance.new("WeldConstraint")
			weld.Part0 = p
			weld.Part1 = rib
			weld.Parent = rib
			rib.Parent = p
		end
		add(p, mid * CFrame.new(0, height - 0.8, 0))
	else
		local p = leaf(parent, mid, Vector3.new(width - 0.1, height - 0.05, 0.4), opts)
		local hinge = mid * CFrame.new(-width / 2, 0, 0)
		add(p, hinge * CFrame.Angles(0, -math.pi / 2, 0) * CFrame.new(width / 2, 0, 0))
	end

	if style ~= "Double" then
		local prompt = Build.Prompt(door.Leaves[1], "Openen", opts.Name or "Deur", 8)
		door.Prompt = prompt
		prompt.Triggered:Connect(function(player)
			if door.Locked and player.UserId ~= door.OwnerUserId then
				if notify then
					notify(player, "🔒 Deze deur zit op slot")
				end
				return
			end
			Doors.SetOpen(door, not door.Open)
		end)
	end
	return door
end

-- Automatische deuren openen als er iemand in de buurt is
task.spawn(function()
	while true do
		task.wait(0.3)
		local positions = {}
		for _, player in Players:GetPlayers() do
			local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart") :: BasePart?
			if root then
				table.insert(positions, root.Position)
			end
		end
		for _, door in autoDoors do
			local near = false
			for _, pos in positions do
				if (pos - door.Center).Magnitude < 10 then
					near = true
					break
				end
			end
			if not door.Locked then
				Doors.SetOpen(door, near)
			end
		end
	end
end)

return Doors
