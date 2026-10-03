-- FoodService: eten en spullen uit de snackbar en supermarkt (als Tool in je rugzak).
-- Klik 3 keer om eten op te eten.

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = require(Shared.Config)
local Remotes = require(Shared.Remotes)

local FoodService = {}

local function part(parent: Instance, handle: BasePart?, offset: Vector3, size: Vector3, color: Color3, shape: Enum.PartType?): Part
	local p = Instance.new("Part")
	p.Size = size
	p.Color = color
	p.Shape = shape or Enum.PartType.Block
	p.CanCollide = false
	p.Massless = true
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	p.CFrame = CFrame.new(offset)
	if handle then
		p.Name = "Part"
		local weld = Instance.new("WeldConstraint")
		weld.Part0 = handle
		weld.Part1 = p
		weld.Parent = p
	else
		p.Name = "Handle"
	end
	p.Parent = parent
	return p
end

local SHAPES = {
	Friet = function(tool: Tool, color: Color3)
		local h = part(tool, nil, Vector3.zero, Vector3.new(1, 1.2, 0.6), Color3.fromRGB(210, 30, 40))
		for i = -2, 2 do
			part(tool, h, Vector3.new(i * 0.18, 0.75 + (i % 2) * 0.15, 0), Vector3.new(0.15, 0.9, 0.15), color)
		end
	end,
	Burger = function(tool: Tool, color: Color3)
		local bun = Color3.fromRGB(225, 165, 80)
		local h = part(tool, nil, Vector3.zero, Vector3.new(1.2, 0.35, 1.2), bun)
		part(tool, h, Vector3.new(0, 0.28, 0), Vector3.new(1.3, 0.25, 1.3), color)
		part(tool, h, Vector3.new(0, 0.44, 0), Vector3.new(1.35, 0.08, 1.35), Color3.fromRGB(80, 180, 60))
		part(tool, h, Vector3.new(0, 0.7, 0), Vector3.new(1.2, 0.45, 1.2), bun)
	end,
	Frikandel = function(tool: Tool, color: Color3)
		local h = part(tool, nil, Vector3.zero, Vector3.new(0.4, 0.4, 2), color)
		part(tool, h, Vector3.new(-0.08, 0.21, 0), Vector3.new(0.12, 0.05, 1.8), Color3.fromRGB(210, 40, 40))
		part(tool, h, Vector3.new(0.08, 0.21, 0), Vector3.new(0.12, 0.05, 1.8), Color3.fromRGB(250, 245, 230))
	end,
	Cola = function(tool: Tool, color: Color3)
		local h = part(tool, nil, Vector3.zero, Vector3.new(0.8, 1.3, 0.8), color)
		part(tool, h, Vector3.new(0, 0.1, 0), Vector3.new(0.82, 0.3, 0.82), Color3.new(1, 1, 1))
	end,
	Ijsje = function(tool: Tool, color: Color3)
		local h = part(tool, nil, Vector3.zero, Vector3.new(0.5, 1.2, 0.5), Color3.fromRGB(220, 170, 100))
		part(tool, h, Vector3.new(0, 0.9, 0), Vector3.new(0.95, 0.95, 0.95), color, Enum.PartType.Ball)
	end,
	Boodschappen = function(tool: Tool, color: Color3)
		local h = part(tool, nil, Vector3.zero, Vector3.new(1.6, 1.6, 0.9), color)
		part(tool, h, Vector3.new(0, 0.95, 0), Vector3.new(0.9, 0.3, 0.1), color)
		part(tool, h, Vector3.new(-0.3, 0.9, 0.1), Vector3.new(0.4, 0.6, 0.4), Color3.fromRGB(205, 150, 80))
		part(tool, h, Vector3.new(0.35, 1, 0), Vector3.new(0.35, 0.8, 0.35), Color3.new(1, 1, 1))
	end,
	Brood = function(tool: Tool, color: Color3)
		part(tool, nil, Vector3.zero, Vector3.new(0.8, 0.7, 1.8), color)
	end,
	Melk = function(tool: Tool, color: Color3)
		local h = part(tool, nil, Vector3.zero, Vector3.new(0.7, 1.4, 0.7), color)
		part(tool, h, Vector3.new(0, 0.1, -0.36), Vector3.new(0.6, 0.5, 0.05), Color3.fromRGB(60, 120, 220))
	end,
	Appel = function(tool: Tool, color: Color3)
		local h = part(tool, nil, Vector3.zero, Vector3.new(0.9, 0.9, 0.9), color, Enum.PartType.Ball)
		part(tool, h, Vector3.new(0, 0.55, 0), Vector3.new(0.1, 0.3, 0.1), Color3.fromRGB(90, 60, 30))
	end,
	Chips = function(tool: Tool, color: Color3)
		local h = part(tool, nil, Vector3.zero, Vector3.new(1, 1.4, 0.4), color)
		part(tool, h, Vector3.new(0, 0, -0.21), Vector3.new(0.7, 0.5, 0.05), Color3.fromRGB(200, 40, 40))
	end,
}

function FoodService.Give(player: Player, foodId: string)
	local def
	for _, f in Config.Food do
		if f.Id == foodId then
			def = f
		end
	end
	if not def then
		return
	end
	local backpack = player:FindFirstChildOfClass("Backpack")
	if not backpack then
		return
	end
	-- maximaal 1 van elk
	if backpack:FindFirstChild(def.Name) or (player.Character and player.Character:FindFirstChild(def.Name)) then
		Remotes.Event("Notify"):FireClient(player, "Je hebt al " .. def.Name .. "!")
		return
	end

	local tool = Instance.new("Tool")
	tool.Name = def.Name
	tool.CanBeDropped = false
	tool.ToolTip = "Klik om te eten"
	SHAPES[def.Id](tool, def.Color)

	local bites = 0
	tool.Activated:Connect(function()
		if def.Id == "Boodschappen" then
			return
		end
		bites += 1
		if bites >= 3 then
			tool:Destroy()
			Remotes.Event("Notify"):FireClient(player, "Lekker! 😋")
		end
	end)

	tool.Parent = backpack
	Remotes.Event("Notify"):FireClient(player, "Alsjeblieft, " .. def.Name .. "!")
end

function FoodService.Init(world: any)
	Remotes.Event("OrderFood").OnServerEvent:Connect(function(player, foodId)
		if typeof(foodId) ~= "string" then
			return
		end
		local shop = nil
		for _, f in Config.Food do
			if f.Id == foodId then
				shop = f.Shop
			end
		end
		local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart") :: BasePart?
		local near = false
		for _, counter in world.ShopCounters[shop or ""] or {} do
			if root and (root.Position - counter).Magnitude < 30 then
				near = true
			end
		end
		if not near then
			Remotes.Event("Notify"):FireClient(player, "Ga naar de " .. string.lower(shop or "winkel") .. " om dit te halen.")
			return
		end
		FoodService.Give(player, foodId)
	end)
end

return FoodService
