--[[
	WorldBuilder: bouwt de hele stad met code.

	Plattegrond (bovenaanzicht, noord = boven), 4 x 4 blokken:

	  [Politie]      [Brandweer]   [Ziekenhuis]  [School]
	  [Bank]         [Plein]       [Winkels]     [Kantoor]
	  [Autodealer]   [Lindelaan]   [Eikenweg]    [Berkenhof]
	  [Villa's]      [Villa's]     [Park]        [Kastanjelaan]
	  ~~~~~~~~~~~~~~~~~~ strand en zee ~~~~~~~~~~~~~~~~~~

	Rondom liggen heuvels met dennenbomen.
]]

local Workspace = game:GetService("Workspace")

local Build = require(script.Parent.Build)
local Furniture = require(script.Parent.Furniture)
local Buildings = require(script.Parent.Buildings)
local Homes = require(script.Parent.Homes)

local WorldBuilder = {}

local G = 0.6 -- hoogte van stoepen en gras in de stad
local ROAD_W = 28
local ROADS = { -400, -200, 0, 200, 400 }
local BLOCKS = { -300, -100, 100, 300 }
local BLOCK = 172
local SIDEWALK = 8
local ROAD_END = 470
local BEACH_START = 470
local SEA_START = 570

local M = Enum.Material

local function rgb(r: number, g: number, b: number): Color3
	return Color3.fromRGB(r, g, b)
end

local C = {
	Asphalt = rgb(46, 46, 52),
	Line = rgb(240, 240, 235),
	Sidewalk = rgb(196, 194, 188),
	Curb = rgb(160, 160, 158),
	Lawn = rgb(98, 168, 78),
	Plaza = rgb(214, 202, 180),
}

local LAYOUT = {
	{ -300, -300, "Police" },
	{ -100, -300, "FireStation" },
	{ 100, -300, "Hospital" },
	{ 300, -300, "School" },
	{ -300, -100, "Bank" },
	{ -100, -100, "Plaza" },
	{ 100, -100, "Shops" },
	{ 300, -100, "Office" },
	{ -300, 100, "CarDealer" },
	{ -100, 100, "Houses", "Lindelaan" },
	{ 100, 100, "Houses", "Eikenweg" },
	{ 300, 100, "Houses", "Berkenhof" },
	{ -300, 300, "Villas" },
	{ -100, 300, "Villas" },
	{ 100, 300, "Park" },
	{ 300, 300, "Houses", "Kastanjelaan" },
}

local function newModel(name: string, parent: Instance): Model
	local m = Instance.new("Model")
	m.Name = name
	m.Parent = parent
	return m
end

local function nearRoad(v: number, margin: number): boolean
	for _, r in ROADS do
		if math.abs(v - r) < ROAD_W / 2 + margin then
			return true
		end
	end
	return false
end

------------------------------------------------------------------------
-- Terrein: gras, heuvels, strand en zee
------------------------------------------------------------------------

local function buildTerrain(terrain: Terrain, world: any, parent: Instance)
	pcall(function()
		(terrain :: any).Decoration = false
	end)
	terrain.WaterColor = rgb(40, 130, 170)
	terrain.WaterTransparency = 0.6
	terrain.WaterWaveSize = 0.12
	terrain.WaterReflectance = 0.6

	terrain:FillBlock(CFrame.new(0, -6, 60), Vector3.new(1440, 12, 1520), M.Grass)
	-- strand
	terrain:FillBlock(CFrame.new(0, -6, (BEACH_START + SEA_START) / 2), Vector3.new(1440, 12, SEA_START - BEACH_START), M.Sand)
	-- zee
	terrain:FillBlock(CFrame.new(0, -6, SEA_START + 130), Vector3.new(1440, 12, 260), M.Water)
	terrain:FillBlock(CFrame.new(0, -16, SEA_START + 130), Vector3.new(1440, 8, 260), M.Sand)
	terrain:FillBlock(CFrame.new(0, -7, SEA_START + 10), Vector3.new(1440, 10, 20), M.Sand)
	terrain:FillBlock(CFrame.new(0, -9, SEA_START + 30), Vector3.new(1440, 8, 20), M.Sand)

	-- heuvels rondom (niet aan de strandkant)
	local rng = Furniture.Random
	for i = 1, 46 do
		local angle = (i / 46) * math.pi * 2
		local dir = Vector3.new(math.sin(angle), 0, -math.cos(angle))
		if dir.Z < 0.55 then
			local dist = rng:NextNumber(600, 690)
			local center = dir * dist
			local radius = rng:NextNumber(70, 120)
			terrain:FillBall(Vector3.new(center.X, -radius * 0.45, center.Z), radius, rng:NextNumber() < 0.25 and M.Rock or M.Grass)
		end
	end

	-- dennen op de heuvels
	local trees = newModel("Heuvelbomen", parent)
	local params = RaycastParams.new()
	params.FilterType = Enum.RaycastFilterType.Include
	params.FilterDescendantsInstances = { terrain }
	local placed, tries = 0, 0
	while placed < 140 and tries < 2000 do
		tries += 1
		local x = rng:NextNumber(-690, 690)
		local z = rng:NextNumber(-690, 420)
		local r = math.max(math.abs(x), math.abs(z))
		if r > 500 then
			local hit = Workspace:Raycast(Vector3.new(x, 200, z), Vector3.new(0, -400, 0), params)
			if hit and hit.Material ~= M.Water and hit.Position.Y > 2 then
				Furniture.Pine(trees, hit.Position - Vector3.new(0, 0.5, 0), rng:NextNumber(1, 1.8))
				placed += 1
			end
		end
	end
end

------------------------------------------------------------------------
-- Wegen
------------------------------------------------------------------------

local function buildRoads(parent: Instance, world: any)
	local roads = newModel("Wegen", parent)

	for _, c in ROADS do
		-- oost-west weg
		Build.Box(roads, CFrame.new(0, 0, c), Vector3.new(ROAD_END * 2, 0.2, ROAD_W), C.Asphalt, M.Asphalt)
		for x = -ROAD_END + 8, ROAD_END - 8, 16 do
			if not nearRoad(x, 4) then
				Build.Box(roads, CFrame.new(x, 0.12, c), Vector3.new(7, 0.04, 0.5), C.Line)
			end
		end
		-- noord-zuid weg in stukken tussen de kruispunten
		local edges = { -ROAD_END }
		for _, r in ROADS do
			table.insert(edges, r - ROAD_W / 2)
			table.insert(edges, r + ROAD_W / 2)
		end
		table.insert(edges, ROAD_END)
		for i = 1, #edges, 2 do
			local z1, z2 = edges[i], edges[i + 1]
			Build.Box(roads, CFrame.new(c, 0, (z1 + z2) / 2), Vector3.new(ROAD_W, 0.2, z2 - z1), C.Asphalt, M.Asphalt)
			for z = z1 + 10, z2 - 10, 16 do
				Build.Box(roads, CFrame.new(c, 0.12, z), Vector3.new(0.5, 0.04, 7), C.Line)
			end
		end
	end

	-- zebrapaden en verkeerslichten op de kruispunten in het centrum
	for _, cx in { -200, 0, 200 } do
		for _, cz in { -200, 0, 200 } do
			for _, s in { -1, 1 } do
				for i = -5, 5 do
					Build.Box(roads, CFrame.new(cx + i * 2.3, 0.12, cz + s * (ROAD_W / 2 + 4)), Vector3.new(1.2, 0.04, 6), C.Line)
					Build.Box(roads, CFrame.new(cx + s * (ROAD_W / 2 + 4), 0.12, cz + i * 2.3), Vector3.new(6, 0.04, 1.2), C.Line)
				end
			end
			for _, sx in { -1, 1 } do
				for _, sz in { -1, 1 } do
					local p = Vector3.new(cx + sx * (ROAD_W / 2 + 2), G, cz + sz * (ROAD_W / 2 + 2))
					Furniture.TrafficLight(roads, CFrame.lookAt(p, p + Vector3.new(0, 0, sz)))
				end
			end
		end
	end
end

local function buildBlock(parent: Instance, bx: number, bz: number, lawn: string?, world: any)
	local m = newModel("Blok", parent)
	local half = BLOCK / 2
	local inner = BLOCK - SIDEWALK * 2
	for _, s in { -1, 1 } do
		Build.Box(m, CFrame.new(bx, G / 2, bz + s * (half - SIDEWALK / 2)), Vector3.new(BLOCK, G, SIDEWALK), C.Sidewalk, M.Concrete)
		Build.Box(m, CFrame.new(bx + s * (half - SIDEWALK / 2), G / 2, bz), Vector3.new(SIDEWALK, G, inner), C.Sidewalk, M.Concrete)
		-- stoeprand
		Build.Box(m, CFrame.new(bx, G / 2 + 0.02, bz + s * (half - 0.4)), Vector3.new(BLOCK, G + 0.04, 0.8), C.Curb, M.Concrete)
		Build.Box(m, CFrame.new(bx + s * (half - 0.4), G / 2 + 0.02, bz), Vector3.new(0.8, G + 0.04, BLOCK - 1.6), C.Curb, M.Concrete)
	end
	if lawn == "Grass" then
		Build.Box(m, CFrame.new(bx, G / 2, bz), Vector3.new(inner, G, inner), C.Lawn, M.Grass)
	elseif lawn == "Plaza" then
		Build.Box(m, CFrame.new(bx, G / 2, bz), Vector3.new(inner, G, inner), C.Plaza, M.Pavement)
	end

	-- lantaarns langs de stoep, met de arm naar de weg
	for _, s in { -1, 1 } do
		for _, o in { -43, 43 } do
			table.insert(world.StreetLamps, Furniture.StreetLamp(m, Vector3.new(bx + o, G, bz + s * (half - 2)), Vector3.new(0, 0, s)))
			table.insert(world.StreetLamps, Furniture.StreetLamp(m, Vector3.new(bx + s * (half - 2), G, bz + o), Vector3.new(s, 0, 0)))
		end
	end
end

local function outskirts(parent: Instance)
	local m = newModel("Bomen", parent)
	local rng = Furniture.Random
	local placed = 0
	while placed < 110 do
		local x = rng:NextNumber(-495, 495)
		local z = rng:NextNumber(-495, BEACH_START - 8)
		local outside = math.abs(x) > 418 or math.abs(z) > 418
		if outside and not nearRoad(x, 6) and not nearRoad(z, 6) then
			if rng:NextNumber() < 0.6 then
				Furniture.Pine(m, Vector3.new(x, 0, z), rng:NextNumber(0.9, 1.5))
			else
				Furniture.Tree(m, Vector3.new(x, 0, z), rng:NextNumber(0.9, 1.3))
			end
			placed += 1
		end
	end
end

------------------------------------------------------------------------

function WorldBuilder.Build()
	local world = {
		Houses = {},
		VehiclePads = {},
		JailCells = {},
		JailExit = CFrame.new(),
		StreetLamps = {},
		MenuPrompts = {},
		RolePrompts = {},
		ShopCounters = {},
		Bank = nil :: any,
		Ground = nil :: Instance?,
	}

	local map = Instance.new("Folder")
	map.Name = "Stad"

	local terrain = Workspace:FindFirstChildOfClass("Terrain")
	if terrain then
		buildTerrain(terrain, world, map)
		world.Ground = terrain
	end

	buildRoads(map, world)

	local blocks = newModel("Blokken", map)
	local buildings = newModel("Gebouwen", map)
	local homes = newModel("Huizen", map)
	local houseIndex = 0
	local villaIndex = 0

	for _, entry in LAYOUT do
		local bx, bz, kind = entry[1], entry[2], entry[3]
		local lawn = "Grass"
		if kind == "Villas" or kind == "Park" then
			lawn = nil
		elseif kind == "Plaza" then
			lawn = "Plaza"
		end
		buildBlock(blocks, bx, bz, lawn, world)

		if kind == "Houses" then
			local n = 0
			for _, row in { { z = -39, yaw = 0 }, { z = 39, yaw = math.pi } } do
				for _, x in { -39, 39 } do
					n += 1
					houseIndex += 1
					local plot = CFrame.new(bx + x, G, bz + row.z) * CFrame.Angles(0, row.yaw, 0)
					Homes.House(homes, plot, entry[4] .. " " .. n, houseIndex, world)
				end
			end
		elseif kind == "Villas" then
			for _, row in { { z = -39, yaw = 0 }, { z = 39, yaw = math.pi } } do
				villaIndex += 1
				local plot = CFrame.new(bx, G, bz + row.z) * CFrame.Angles(0, row.yaw, 0)
				Homes.Villa(homes, plot, "Villa Zonneheuvel " .. villaIndex, villaIndex, world)
			end
		else
			Buildings[kind](buildings, bx, bz, world)
			if kind ~= "Plaza" and kind ~= "Park" then
				for _, sx in { -1, 1 } do
					for _, sz in { -1, 1 } do
						Furniture.Tree(buildings, Vector3.new(bx + sx * 70, G, bz + sz * 70), 1.2)
					end
				end
			end
		end
	end

	Buildings.Beach(buildings, BEACH_START, SEA_START, world)
	outskirts(map)

	map.Parent = Workspace
	return world
end

return WorldBuilder
