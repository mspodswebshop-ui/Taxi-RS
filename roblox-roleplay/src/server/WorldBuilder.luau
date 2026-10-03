--[[
	WorldBuilder: bouwt de hele stad met code.

	Plattegrond (bovenaanzicht, noord = boven):

	   [Politie]   [Snackbar]   [Kantoor]
	   [Autodealer] [Plein]     [Huizen Lindelaan]
	   [Huizen Eikenweg] [Huizen Berkenhof] [Villa's]

	Elk blok ligt tussen 4 wegen. De voorkant van een gebouw is lokaal de -Z kant.
]]

local Workspace = game:GetService("Workspace")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = require(Shared.Config)
local Build = require(script.Parent.Build)
local VehicleBuilder = require(script.Parent.VehicleBuilder)

local WorldBuilder = {}

local G = 0.6 -- hoogte van stoepen en grasvelden
local F = 0.4 -- hoogte van een vloer binnen een gebouw
local ROAD_W = 24
local ROADS = { -240, -80, 80, 240 }
local BLOCK = 136 -- breedte van een blok tussen de wegen
local SIDEWALK = 8
local HALF_MAP = 400

local function rgb(r: number, g: number, b: number): Color3
	return Color3.fromRGB(r, g, b)
end

local C = {
	Grass = rgb(88, 158, 68),
	Lawn = rgb(104, 172, 82),
	Asphalt = rgb(48, 48, 54),
	Line = rgb(240, 240, 235),
	Sidewalk = rgb(192, 190, 184),
	Plaza = rgb(218, 206, 184),
	Wood = rgb(150, 105, 65),
	DarkWood = rgb(95, 62, 40),
	White = rgb(245, 245, 245),
	Black = rgb(28, 28, 32),
	Metal = rgb(125, 128, 138),
	Water = rgb(70, 160, 235),
	Leaves = rgb(52, 135, 55),
	Trunk = rgb(110, 75, 45),
	Gold = rgb(232, 182, 40),
	PoliceBlue = rgb(28, 70, 175),
	Red = rgb(205, 40, 40),
	Yellow = rgb(250, 205, 40),
	Screen = rgb(40, 90, 200),
}

local HOUSE_COLORS = {
	rgb(242, 222, 182),
	rgb(182, 212, 232),
	rgb(242, 192, 192),
	rgb(202, 232, 192),
	rgb(232, 232, 232),
	rgb(250, 230, 150),
	rgb(215, 190, 240),
	rgb(255, 210, 160),
}
local ROOF_COLORS = { rgb(120, 60, 50), rgb(60, 60, 70), rgb(70, 90, 120), rgb(90, 70, 55) }

local SOFA_COLORS = { rgb(70, 90, 160), rgb(160, 60, 60), rgb(80, 130, 90), rgb(110, 110, 110) }

local world = {
	Houses = {},
	VehiclePads = {},
	JailCells = {},
	JailExit = CFrame.new(),
	StreetLamps = {},
	MenuPrompts = {},
	RolePrompts = {},
	SnackCounter = Vector3.zero,
	Ground = nil :: BasePart?,
}

local rng = Random.new(2024)

local function at(cf: CFrame, x: number, y: number, z: number): CFrame
	return cf * CFrame.new(x, y, z)
end

local function newModel(name: string, parent: Instance): Model
	local m = Instance.new("Model")
	m.Name = name
	m.Parent = parent
	return m
end

------------------------------------------------------------------------
-- Meubels en decoratie (cf = op de vloer, voorkant = -Z)
------------------------------------------------------------------------

local function seat(model: Instance, cf: CFrame, size: Vector3, color: Color3): Seat
	return Build.New("Seat", { CFrame = cf, Size = size, Color = color, Material = Enum.Material.Fabric, Parent = model })
end

local function chair(model: Instance, cf: CFrame, color: Color3?)
	local c = color or C.Wood
	Build.Box(model, at(cf, 0, 0.8, 0), Vector3.new(1.6, 1.6, 1.6), c)
	seat(model, at(cf, 0, 1.8, 0), Vector3.new(2, 0.4, 2), c)
	Build.Box(model, at(cf, 0, 3.2, 0.85), Vector3.new(2, 2.4, 0.3), c)
end

local function tableFurniture(model: Instance, cf: CFrame, w: number, d: number, color: Color3?)
	local c = color or C.Wood
	Build.Box(model, at(cf, 0, 3, 0), Vector3.new(w, 0.3, d), c)
	for _, sx in { -1, 1 } do
		for _, sz in { -1, 1 } do
			Build.Box(model, at(cf, sx * (w / 2 - 0.4), 1.45, sz * (d / 2 - 0.4)), Vector3.new(0.4, 2.9, 0.4), c)
		end
	end
end

local function sofa(model: Instance, cf: CFrame, width: number, color: Color3)
	Build.Box(model, at(cf, 0, 0.5, 0), Vector3.new(width, 1, 3), color, Enum.Material.Fabric)
	seat(model, at(cf, 0, 1.25, 0), Vector3.new(width, 0.5, 3), color)
	Build.Box(model, at(cf, 0, 2.2, 1.9), Vector3.new(width, 2.8, 0.8), color, Enum.Material.Fabric)
	for _, s in { -1, 1 } do
		Build.Box(model, at(cf, s * (width / 2 + 0.4), 1.2, 0.4), Vector3.new(0.8, 2, 3.8), color, Enum.Material.Fabric)
	end
end

local function bed(model: Instance, cf: CFrame, color: Color3, wide: boolean?)
	local w = wide and 9 or 6
	Build.Box(model, at(cf, 0, 0.7, 0), Vector3.new(w, 1.4, 9), C.DarkWood, Enum.Material.Wood)
	seat(model, at(cf, 0, 1.7, 0), Vector3.new(w - 0.4, 0.6, 8.6), C.White)
	Build.Box(model, at(cf, 0, 2.1, -1.4), Vector3.new(w - 0.2, 0.3, 5.6), color, Enum.Material.Fabric)
	Build.Box(model, at(cf, 0, 2.25, 3.3), Vector3.new(w - 2, 0.5, 1.6), C.White, Enum.Material.Fabric)
	Build.Box(model, at(cf, 0, 2.2, 4.75), Vector3.new(w, 4.4, 0.5), C.DarkWood, Enum.Material.Wood)
end

local function tv(model: Instance, cf: CFrame)
	Build.Box(model, at(cf, 0, 1, 0), Vector3.new(6, 2, 1.6), C.DarkWood, Enum.Material.Wood)
	Build.Box(model, at(cf, 0, 4.6, 0.2), Vector3.new(7, 4, 0.3), C.Black)
	Build.Box(model, at(cf, 0, 4.6, 0.02), Vector3.new(6.6, 3.6, 0.05), C.Screen, Enum.Material.Neon)
end

local function counter(model: Instance, cf: CFrame, length: number, color: Color3?): Part
	Build.Box(model, at(cf, 0, 1.7, 0), Vector3.new(length, 3.4, 2.6), color or C.White)
	return Build.Box(model, at(cf, 0, 3.55, 0), Vector3.new(length + 0.2, 0.3, 2.8), rgb(60, 60, 65), Enum.Material.Marble)
end

local function fridge(model: Instance, cf: CFrame)
	Build.Box(model, at(cf, 0, 3.5, 0), Vector3.new(3.2, 7, 3), rgb(225, 228, 232), Enum.Material.Metal)
	Build.Box(model, at(cf, 1, 4.5, -1.55), Vector3.new(0.2, 2, 0.2), C.Metal, Enum.Material.Metal)
end

local function desk(model: Instance, cf: CFrame)
	tableFurniture(model, cf, 6, 3, rgb(225, 225, 225))
	Build.Box(model, at(cf, 0, 4.2, 0.7), Vector3.new(2.8, 1.8, 0.2), C.Black)
	Build.Box(model, at(cf, 0, 4.2, 0.58), Vector3.new(2.5, 1.5, 0.05), C.Screen, Enum.Material.Neon)
	Build.Box(model, at(cf, 0, 3.2, -0.4), Vector3.new(2, 0.1, 0.7), C.Black)
	chair(model, at(cf, 0, 0, -2.6) * CFrame.Angles(0, math.pi, 0), rgb(40, 40, 45))
end

local function plant(model: Instance, cf: CFrame)
	Build.Cylinder(model, at(cf, 0, 0.8, 0), 1.6, 1.6, rgb(180, 90, 50))
	Build.Ball(model, at(cf, 0, 2.6, 0), 2.6, C.Leaves, Enum.Material.Grass)
end

local function ceilingLight(model: Instance, cf: CFrame)
	local lamp = Build.Box(model, cf, Vector3.new(2, 0.2, 2), rgb(255, 245, 220), Enum.Material.Neon)
	Build.Light(lamp, rgb(255, 235, 200), 28, 1)
end

local function rug(model: Instance, cf: CFrame, size: Vector2, color: Color3)
	Build.Box(model, at(cf, 0, 0.05, 0), Vector3.new(size.X, 0.1, size.Y), color, Enum.Material.Fabric)
end

local function tree(model: Instance, pos: Vector3, scale: number?)
	local s = scale or 1
	Build.Cylinder(model, CFrame.new(pos + Vector3.new(0, 3.5 * s, 0)), 7 * s, 1.4 * s, C.Trunk, Enum.Material.Wood)
	Build.Ball(model, CFrame.new(pos + Vector3.new(0, 9 * s, 0)), 8 * s, C.Leaves, Enum.Material.Grass)
	Build.Ball(model, CFrame.new(pos + Vector3.new(1.5 * s, 11 * s, 1 * s)), 6 * s, rgb(62, 148, 62), Enum.Material.Grass)
end

local function palm(model: Instance, pos: Vector3)
	Build.Cylinder(model, CFrame.new(pos + Vector3.new(0, 6, 0)), 12, 1, rgb(150, 110, 70), Enum.Material.Wood)
	for i = 1, 6 do
		local cf = CFrame.new(pos + Vector3.new(0, 12, 0)) * CFrame.Angles(0, i * math.pi / 3, 0) * CFrame.Angles(-0.35, 0, 0) * CFrame.new(0, 0, -3.2)
		Build.Box(model, cf, Vector3.new(1.4, 0.3, 7), rgb(60, 160, 60), Enum.Material.Grass)
	end
end

local function bench(model: Instance, cf: CFrame)
	seat(model, at(cf, 0, 1.6, 0), Vector3.new(5, 0.4, 1.6), C.Wood)
	Build.Box(model, at(cf, 0, 2.5, 0.75), Vector3.new(5, 1.6, 0.3), C.Wood, Enum.Material.Wood)
	for _, s in { -1, 1 } do
		Build.Box(model, at(cf, s * 2, 0.7, 0), Vector3.new(0.4, 1.4, 1.4), C.Black)
	end
end

local function flowerbed(model: Instance, cf: CFrame, w: number, d: number)
	Build.Box(model, at(cf, 0, 0.4, 0), Vector3.new(w, 0.8, d), rgb(90, 60, 40), Enum.Material.Ground)
	local colors = { rgb(240, 80, 120), rgb(250, 220, 60), rgb(240, 240, 255), rgb(170, 90, 230) }
	for _ = 1, math.floor(w * d / 6) do
		local x = rng:NextNumber(-w / 2 + 0.6, w / 2 - 0.6)
		local z = rng:NextNumber(-d / 2 + 0.6, d / 2 - 0.6)
		Build.Ball(model, at(cf, x, 1.1, z), 0.9, colors[rng:NextInteger(1, #colors)])
	end
end

local function streetLamp(model: Instance, pos: Vector3)
	Build.Cylinder(model, CFrame.new(pos + Vector3.new(0, 7, 0)), 14, 0.6, rgb(50, 52, 58), Enum.Material.Metal)
	local lamp = Build.Box(model, CFrame.new(pos + Vector3.new(0, 14.3, 0)), Vector3.new(1.8, 0.6, 1.8), rgb(255, 240, 200))
	local light = Build.Light(lamp, rgb(255, 225, 170), 45, 1.6)
	light.Enabled = false
	table.insert(world.StreetLamps, lamp)
end

local function bigSign(model: Instance, cf: CFrame, size: Vector3, text: string, bg: Color3, fg: Color3): Part
	local sign = Build.Box(model, cf, size, bg)
	Build.Sign(sign, text, fg)
	return sign
end

------------------------------------------------------------------------
-- Gebouwschil: vloer, 4 muren met ramen/deur, plat dak
------------------------------------------------------------------------

type ShellOptions = {
	Color: Color3,
	Material: Enum.Material?,
	Front: { any },
	Sides: { any }?,
	Back: { any }?,
	Roof: Color3?,
	Floor: Color3?,
	FloorMaterial: Enum.Material?,
	Overhang: number?,
}

local function shell(model: Instance, base: CFrame, w: number, d: number, h: number, o: ShellOptions)
	local mat = o.Material or Enum.Material.SmoothPlastic
	Build.Box(model, at(base, 0, 0.2, 0), Vector3.new(w, 0.4, d), o.Floor or rgb(200, 180, 150), o.FloorMaterial or Enum.Material.WoodPlanks)
	Build.Wall(model, at(base, 0, 0, -d / 2 + 0.5), w, h, o.Front, o.Color, mat)
	Build.Wall(model, at(base, 0, 0, d / 2 - 0.5) * CFrame.Angles(0, math.pi, 0), w, h, o.Back or {}, o.Color, mat)
	Build.Wall(model, at(base, -w / 2 + 0.5, 0, 0) * CFrame.Angles(0, math.pi / 2, 0), d - 2, h, table.clone(o.Sides or {}), o.Color, mat)
	Build.Wall(model, at(base, w / 2 - 0.5, 0, 0) * CFrame.Angles(0, -math.pi / 2, 0), d - 2, h, table.clone(o.Sides or {}), o.Color, mat)
	local ov = o.Overhang or 1.5
	Build.Box(model, at(base, 0, h + 0.5, 0), Vector3.new(w + ov * 2, 1, d + ov * 2), o.Roof or rgb(70, 70, 75))
	ceilingLight(model, at(base, 0, h - 0.1, 0))
end

local function addMenuPrompt(part: BasePart, action: string, object: string, menu: string)
	local prompt = Build.Prompt(part, action, object, 10)
	table.insert(world.MenuPrompts, { Prompt = prompt, Menu = menu })
end

local function addRolePrompt(part: BasePart, action: string, object: string, role: string)
	local prompt = Build.Prompt(part, action, object, 10)
	prompt.KeyboardKeyCode = Enum.KeyCode.F
	prompt.GamepadKeyCode = Enum.KeyCode.ButtonY
	table.insert(world.RolePrompts, { Prompt = prompt, Role = role })
end

local function vehiclePad(model: Instance, cf: CFrame)
	local pad = Build.Box(model, at(cf, 0, 0.03, 0), Vector3.new(9, 0.06, 15), rgb(250, 250, 250), Enum.Material.Neon)
	pad.Transparency = 0.5
	addMenuPrompt(pad, "Voertuig kiezen", "Garage", "Vehicles")
	return pad
end

------------------------------------------------------------------------
-- Wegen, stoepen en lantaarns
------------------------------------------------------------------------

local function buildRoads(parent: Instance)
	local roads = newModel("Wegen", parent)

	local function nearCrossing(value: number): boolean
		for _, r in ROADS do
			if math.abs(value - r) < ROAD_W / 2 + 4 then
				return true
			end
		end
		return false
	end

	for _, c in ROADS do
		-- oost-west weg over de hele kaart
		Build.Box(roads, CFrame.new(0, 0, c), Vector3.new(HALF_MAP * 2, 0.2, ROAD_W), C.Asphalt, Enum.Material.Asphalt)
		for x = -HALF_MAP + 8, HALF_MAP - 8, 16 do
			if not nearCrossing(x) then
				Build.Box(roads, CFrame.new(x, 0.12, c), Vector3.new(7, 0.04, 0.6), C.Line)
			end
		end

		-- noord-zuid weg in stukken tussen de kruispunten
		local edges = { -HALF_MAP }
		for _, r in ROADS do
			table.insert(edges, r - ROAD_W / 2)
			table.insert(edges, r + ROAD_W / 2)
		end
		table.insert(edges, HALF_MAP)
		for i = 1, #edges, 2 do
			local z1, z2 = edges[i], edges[i + 1]
			Build.Box(roads, CFrame.new(c, 0, (z1 + z2) / 2), Vector3.new(ROAD_W, 0.2, z2 - z1), C.Asphalt, Enum.Material.Asphalt)
			for z = z1 + 10, z2 - 10, 16 do
				Build.Box(roads, CFrame.new(c, 0.12, z), Vector3.new(0.6, 0.04, 7), C.Line)
			end
		end
	end

	-- zebrapaden bij het plein
	for _, side in { -1, 1 } do
		for i = -4, 4 do
			Build.Box(roads, CFrame.new(i * 2.2, 0.12, side * 80), Vector3.new(1.2, 0.04, ROAD_W - 6), C.Line)
		end
	end
end

local function buildBlock(parent: Instance, bx: number, bz: number, lawnColor: Color3, lawnMaterial: Enum.Material)
	local m = newModel("Blok", parent)
	local half = BLOCK / 2
	local inner = BLOCK - SIDEWALK * 2
	for _, s in { -1, 1 } do
		Build.Box(m, CFrame.new(bx, G / 2, bz + s * (half - SIDEWALK / 2)), Vector3.new(BLOCK, G, SIDEWALK), C.Sidewalk, Enum.Material.Concrete)
		Build.Box(m, CFrame.new(bx + s * (half - SIDEWALK / 2), G / 2, bz), Vector3.new(SIDEWALK, G, inner), C.Sidewalk, Enum.Material.Concrete)
	end
	Build.Box(m, CFrame.new(bx, G / 2, bz), Vector3.new(inner, G, inner), lawnColor, lawnMaterial)

	for _, sx in { -1, 1 } do
		for _, sz in { -1, 1 } do
			streetLamp(m, Vector3.new(bx + sx * (half - 3), G, bz + sz * (half - 3)))
		end
	end
end

------------------------------------------------------------------------
-- Huizen en villa's
------------------------------------------------------------------------

local houseCount = 0

local function registerHouse(name: string, premium: boolean, door: BasePart, lockLight: BasePart, sign: TextLabel, entrance: CFrame)
	houseCount += 1
	local prompt = Build.Prompt(door, "Claim huis", name, 8)
	table.insert(world.Houses, {
		Id = "Huis" .. houseCount,
		Name = name,
		Premium = premium,
		Door = door,
		LockLight = lockLight,
		Sign = sign,
		Prompt = prompt,
		Entrance = entrance,
	})
end

local function mailbox(model: Instance, cf: CFrame): TextLabel
	Build.Cylinder(model, at(cf, 0, 1.6, 0), 3.2, 0.4, C.Black)
	local board = Build.Box(model, at(cf, 0, 4, 0), Vector3.new(5, 1.8, 0.3), C.White)
	return Build.Sign(board, "Te koop", C.Black)
end

local function house(parent: Instance, base: CFrame, name: string, index: number)
	local m = newModel(name, parent)
	local w, d, h = 36, 30, 12
	local color = HOUSE_COLORS[(index - 1) % #HOUSE_COLORS + 1]
	local roof = ROOF_COLORS[(index - 1) % #ROOF_COLORS + 1]
	local doorX = -8

	local front = Build.Windows(w, 4, 5, 3, 8, { doorX })
	table.insert(front, { x = doorX, w = 5, bottom = 0, top = 8, glass = false })
	shell(m, base, w, d, h, {
		Color = color,
		Material = index % 3 == 0 and Enum.Material.Brick or Enum.Material.SmoothPlastic,
		Front = front,
		Sides = Build.Windows(d - 2, 3, 5, 3, 8),
		Back = Build.Windows(w, 4, 5, 3, 8),
		Roof = roof,
	})
	-- extra dakrand en schoorsteen
	Build.Box(m, at(base, 0, h + 1.5, 0), Vector3.new(w - 6, 1, d - 6), roof)
	Build.Box(m, at(base, 10, h + 3.5, 6), Vector3.new(2.5, 5, 2.5), rgb(150, 70, 55), Enum.Material.Brick)

	-- deur met slot-lampje
	local door = Build.Box(m, at(base, doorX, F + 3.8, -d / 2 + 0.5), Vector3.new(5, 7.6, 0.6), C.DarkWood, Enum.Material.Wood)
	door.Name = "Door"
	local lockLight = Build.Box(m, at(base, doorX + 3.2, 5, -d / 2 - 0.1), Vector3.new(0.5, 0.5, 0.2), rgb(40, 220, 80), Enum.Material.Neon)

	-- tuinpad, oprit, brievenbus
	Build.Box(m, at(base, doorX, 0.05, -d / 2 - 9), Vector3.new(4, 0.1, 18), C.Sidewalk, Enum.Material.Concrete)
	Build.Box(m, at(base, 10, 0.05, -d / 2 - 9), Vector3.new(10, 0.1, 18), rgb(150, 150, 150), Enum.Material.Concrete)
	local sign = mailbox(m, at(base, -15, 0, -d / 2 - 15))
	flowerbed(m, at(base, -1, 0, -d / 2 - 2), 6, 2.5)
	tree(m, (at(base, -14, 0, d / 2 + 6)).Position, 0.9)

	-- inrichting
	local sofaColor = SOFA_COLORS[(index - 1) % #SOFA_COLORS + 1]
	rug(m, at(base, 7, F, -4), Vector2.new(10, 8), rgb(200, 190, 170))
	sofa(m, at(base, 7, F, 1), 8, sofaColor)
	tv(m, at(base, 7, F, -11) * CFrame.Angles(0, math.pi, 0))
	tableFurniture(m, at(base, -9, F, 2), 6, 4)
	chair(m, at(base, -9, F, -0.8) * CFrame.Angles(0, math.pi, 0))
	chair(m, at(base, -9, F, 4.8))
	counter(m, at(base, -7, F, d / 2 - 2.5), 12)
	fridge(m, at(base, -15.5, F, d / 2 - 2.6))
	bed(m, at(base, 12, F, 9), sofaColor)
	plant(m, at(base, 16, F, -12))

	registerHouse(name, false, door, lockLight, sign, at(base, doorX, 0, -d / 2 - 5) * CFrame.Angles(0, math.pi, 0))
end

local function villa(parent: Instance, plot: CFrame, name: string)
	local m = newModel(name, parent)
	local base = at(plot, -22, 0, 0)
	local w, d, h = 56, 36, 14
	local doorX = -14

	local front = {
		{ x = doorX, w = 6, bottom = 0, top = 9, glass = false },
		{ x = 8, w = 30, bottom = 1, top = 12, glass = true },
		{ x = -24, w = 5, bottom = 2, top = 11, glass = true },
	}
	shell(m, base, w, d, h, {
		Color = C.White,
		Material = Enum.Material.SmoothPlastic,
		Front = front,
		Sides = { { x = 0, w = 22, bottom = 1, top = 12, glass = true } },
		Back = { { x = 0, w = 40, bottom = 1, top = 12, glass = true } },
		Roof = rgb(45, 45, 50),
		Floor = rgb(235, 235, 235),
		FloorMaterial = Enum.Material.Marble,
		Overhang = 3,
	})
	Build.Box(m, at(base, 0, h + 1.15, -d / 2 - 3), Vector3.new(w + 6, 0.3, 0.4), C.Gold, Enum.Material.Neon)
	bigSign(m, at(base, doorX, 10.5, -d / 2 - 0.4), Vector3.new(8, 2, 0.4), "👑 VILLA", C.Black, C.Gold)

	local door = Build.Box(m, at(base, doorX, F + 4.3, -d / 2 + 0.5), Vector3.new(6, 8.6, 0.6), C.Black, Enum.Material.Wood)
	door.Name = "Door"
	local lockLight = Build.Box(m, at(base, doorX + 3.8, 5, -d / 2 - 0.1), Vector3.new(0.5, 0.5, 0.2), rgb(40, 220, 80), Enum.Material.Neon)

	-- luxe inrichting
	rug(m, at(base, 10, F, -2), Vector2.new(18, 12), rgb(240, 235, 225))
	sofa(m, at(base, 10, F, 2), 14, rgb(240, 240, 240))
	sofa(m, at(base, 21, F, -4) * CFrame.Angles(0, math.pi / 2, 0), 8, rgb(240, 240, 240))
	tv(m, at(base, 10, F, -12) * CFrame.Angles(0, math.pi, 0))
	tableFurniture(m, at(base, 10, F, -4), 6, 3, C.Black)
	bed(m, at(base, -18, F, 10), rgb(170, 140, 60), true)
	counter(m, at(base, 4, F, 14), 16, C.Black)
	for i = -1, 1 do
		chair(m, at(base, 4 + i * 4, F, 11.5) * CFrame.Angles(0, math.pi, 0), C.Gold)
	end
	fridge(m, at(base, 24, F, 14.5))
	Build.Box(m, at(base, -20, F + 1.6, -6), Vector3.new(6, 3.2, 4), C.Black) -- piano
	Build.Box(m, at(base, -20, F + 3.3, -7.6), Vector3.new(5.6, 0.2, 0.8), C.White)
	plant(m, at(base, 25, F, -15))
	plant(m, at(base, -25, F, -15))

	-- zwembad met ligbedden
	local pool = at(plot, 32, 0, 0)
	local pw, pd = 24, 18
	for _, s in { -1, 1 } do
		Build.Box(m, at(pool, 0, 0.75, s * (pd / 2 + 0.5)), Vector3.new(pw + 2, 1.5, 1), C.White, Enum.Material.Marble)
		Build.Box(m, at(pool, s * (pw / 2 + 0.5), 0.75, 0), Vector3.new(1, 1.5, pd), C.White, Enum.Material.Marble)
	end
	Build.Box(m, at(pool, 0, 0.05, 0), Vector3.new(pw, 0.1, pd), rgb(80, 180, 230), Enum.Material.Granite)
	local water = Build.Box(m, at(pool, 0, 0.6, 0), Vector3.new(pw, 1, pd), C.Water, Enum.Material.Glass)
	water.Transparency = 0.35
	water.CanCollide = false
	Build.Light(water, rgb(120, 200, 255), 20, 1)
	for i = -1, 1 do
		seat(m, at(pool, i * 7, 0.8, -pd / 2 - 5), Vector3.new(2.6, 0.5, 6), C.White)
	end
	palm(m, (at(pool, -pw / 2 - 3, 0, pd / 2 + 4)).Position)
	palm(m, (at(pool, pw / 2 + 3, 0, -pd / 2 - 4)).Position)

	-- heg achter het perceel
	Build.Box(m, at(plot, 0, 1.5, 29), Vector3.new(118, 3, 2), rgb(45, 120, 45), Enum.Material.Grass)

	Build.Box(m, at(base, doorX, 0.05, -d / 2 - 6), Vector3.new(5, 0.1, 12), C.Sidewalk, Enum.Material.Concrete)
	local sign = mailbox(m, at(base, doorX - 6, 0, -d / 2 - 10))
	registerHouse(name, true, door, lockLight, sign, at(base, doorX, 0, -d / 2 - 4) * CFrame.Angles(0, math.pi, 0))
end

local function houseBlock(parent: Instance, bx: number, bz: number, street: string)
	local n = 0
	for _, row in { { z = -27, yaw = 0 }, { z = 27, yaw = math.pi } } do
		for _, x in { -30, 30 } do
			n += 1
			local base = CFrame.new(bx + x, G, bz + row.z) * CFrame.Angles(0, row.yaw, 0)
			house(parent, base, street .. " " .. n, houseCount + 1)
		end
	end
end

------------------------------------------------------------------------
-- Openbare gebouwen
------------------------------------------------------------------------

local function plaza(parent: Instance)
	local m = newModel("Plein", parent)

	-- fontein
	Build.Cylinder(m, CFrame.new(0, G + 0.8, 0), 1.6, 22, rgb(200, 200, 205), Enum.Material.Marble)
	local water = Build.Cylinder(m, CFrame.new(0, G + 1.3, 0), 1.2, 20, C.Water, Enum.Material.Glass)
	water.Transparency = 0.3
	Build.Cylinder(m, CFrame.new(0, G + 4, 0), 6, 3, rgb(200, 200, 205), Enum.Material.Marble)
	Build.Cylinder(m, CFrame.new(0, G + 7.2, 0), 0.8, 9, rgb(200, 200, 205), Enum.Material.Marble)
	local top = Build.Ball(m, CFrame.new(0, G + 8.5, 0), 2, C.Water, Enum.Material.Glass)
	local spray = Instance.new("ParticleEmitter")
	spray.Color = ColorSequence.new(rgb(200, 235, 255))
	spray.Size = NumberSequence.new(0.4)
	spray.Transparency = NumberSequence.new(0.3)
	spray.Lifetime = NumberRange.new(0.9, 1.3)
	spray.Rate = 70
	spray.Speed = NumberRange.new(14, 18)
	spray.SpreadAngle = Vector2.new(18, 18)
	spray.Acceleration = Vector3.new(0, -35, 0)
	spray.EmissionDirection = Enum.NormalId.Top
	spray.Parent = top

	for i = 0, 3 do
		local angle = i * math.pi / 2 + math.pi / 4
		local pos = Vector3.new(math.sin(angle) * 18, G, math.cos(angle) * 18)
		bench(m, CFrame.lookAt(pos, Vector3.new(0, G, 0)))
	end
	for _, sx in { -1, 1 } do
		for _, sz in { -1, 1 } do
			tree(m, Vector3.new(sx * 42, G, sz * 42))
			flowerbed(m, CFrame.new(sx * 30, G, sz * 46), 12, 4)
		end
	end

	-- welkomstbord (kijkt naar het zuiden, naar de spawn)
	local signCf = CFrame.new(0, G, -40) * CFrame.Angles(0, math.pi, 0)
	for _, s in { -1, 1 } do
		Build.Cylinder(m, at(signCf, s * 13, 5, 0), 10, 0.8, C.DarkWood, Enum.Material.Wood)
	end
	bigSign(m, at(signCf, 0, 8, 0), Vector3.new(26, 5, 0.6), "Welkom in " .. Config.TownName .. "! 🌞", C.PoliceBlue, C.White)

	local spawn = Build.New("SpawnLocation", {
		Name = "Spawn",
		CFrame = CFrame.new(0, G + 0.5, 28),
		Size = Vector3.new(16, 1, 10),
		Transparency = 1,
		CanCollide = false,
		CanQuery = false,
		Neutral = true,
		Duration = 0,
		AllowTeamChangeOnTouch = false,
		Parent = m,
	})
	spawn:SetAttribute("Note", "Hier verschijnen spelers")
end

local function policeStation(parent: Instance, bx: number, bz: number)
	local m = newModel("Politiebureau", parent)
	local base = CFrame.new(bx, G, bz + 10) * CFrame.Angles(0, math.pi, 0)
	local w, d, h = 60, 40, 16

	local front = Build.Windows(w, 6, 5, 4, 11, { 0 })
	table.insert(front, { x = 0, w = 8, bottom = 0, top = 10, glass = false })
	shell(m, base, w, d, h, {
		Color = rgb(228, 232, 240),
		Front = front,
		Sides = Build.Windows(d - 2, 3, 5, 4, 11),
		Back = {},
		Roof = rgb(60, 65, 80),
		Floor = rgb(180, 185, 195),
		FloorMaterial = Enum.Material.Slate,
	})
	Build.Box(m, at(base, 0, 13, -d / 2 - 0.1), Vector3.new(w, 1.4, 0.2), C.PoliceBlue)
	bigSign(m, at(base, 0, 14.8, -d / 2 - 0.35), Vector3.new(20, 2.4, 0.4), "POLITIE", C.PoliceBlue, C.White)

	-- balie
	local frontDesk = counter(m, at(base, 0, F, -8), 14, C.PoliceBlue)
	addRolePrompt(frontDesk, "Word politie", "Politiebureau", "Politie")
	for _, x in { -20, 20 } do
		desk(m, at(base, x, F, -8))
		desk(m, at(base, x, F, 2))
	end

	-- cellen achterin
	local cellTop = 10
	for _, x in { -17, -7, 7, 17 } do
		Build.Box(m, at(base, x, F + cellTop / 2, 14), Vector3.new(1, cellTop, 10), rgb(170, 170, 180), Enum.Material.Concrete)
	end
	for i, cx in { -12, 0, 12 } do
		for bxOff = -4.2, 4.2, 1.4 do
			Build.Box(m, at(base, cx + bxOff, F + cellTop / 2, 9), Vector3.new(0.3, cellTop, 0.3), rgb(70, 70, 75), Enum.Material.Metal)
		end
		Build.Box(m, at(base, cx, F + cellTop, 9), Vector3.new(10, 0.4, 0.4), rgb(70, 70, 75), Enum.Material.Metal)
		seat(m, at(base, cx, F + 1.2, 17), Vector3.new(8, 0.6, 2.4), rgb(120, 120, 130))
		world.JailCells[i] = at(base, cx, F, 13.5)
	end
	world.JailExit = at(base, 0, 0, -d / 2 - 8) * CFrame.Angles(0, math.pi, 0)

	-- parkeerplaats met garages voor politieauto's
	Build.Box(m, at(base, 0, 0.05, -35), Vector3.new(w + 20, 0.1, 28), C.Asphalt, Enum.Material.Asphalt)
	vehiclePad(m, at(base, -22, 0.1, -36))
	vehiclePad(m, at(base, 22, 0.1, -36))

	-- vlaggenmast met Nederlandse vlag
	local pole = at(base, -36, 0, -24)
	Build.Cylinder(m, at(pole, 0, 10, 0), 20, 0.5, C.Metal, Enum.Material.Metal)
	for i, color in { rgb(174, 28, 40), C.White, rgb(33, 70, 139) } do
		Build.Box(m, at(pole, 3, 19.5 - i * 1.1, 0), Vector3.new(5.5, 1.1, 0.15), color)
	end
end

local function snackbar(parent: Instance, bx: number, bz: number)
	local m = newModel("Snackbar", parent)
	local base = CFrame.new(bx, G, bz + 14) * CFrame.Angles(0, math.pi, 0)
	local w, d, h = 36, 26, 12

	shell(m, base, w, d, h, {
		Color = rgb(252, 242, 218),
		Front = {
			{ x = -10, w = 6, bottom = 0, top = 9, glass = false },
			{ x = 6, w = 16, bottom = 3, top = 9, glass = true },
		},
		Sides = Build.Windows(d - 2, 2, 5, 3, 8),
		Roof = C.Red,
		Floor = rgb(240, 240, 240),
		FloorMaterial = Enum.Material.Marble,
	})
	-- gestreepte luifel
	for i = 0, 8 do
		local color = i % 2 == 0 and C.Red or C.White
		Build.Box(m, at(base, -w / 2 + 2 + i * 4, 9.8, -d / 2 - 2.5), Vector3.new(4, 0.4, 5), color)
	end
	bigSign(m, at(base, 0, 14.5, -d / 2 + 1), Vector3.new(22, 3.5, 0.6), "SNACKBAR", C.Red, C.Yellow)

	-- reuze patatzak op het dak
	Build.Box(m, at(base, 11, h + 3.5, 5), Vector3.new(4, 5, 3), C.Red)
	for i = 1, 7 do
		local x = 11 + rng:NextNumber(-1.4, 1.4)
		local z = 5 + rng:NextNumber(-0.9, 0.9)
		local len = rng:NextNumber(2, 3.5)
		Build.Box(m, at(base, x, h + 6 + len / 2, z), Vector3.new(0.5, len, 0.5), C.Yellow)
	end

	-- toonbank en keuken
	local top = counter(m, at(base, -4, F, 3), 22, C.Red)
	addMenuPrompt(top, "Bestellen", "Snackbar", "Food")
	world.SnackCounter = top.CFrame.Position
	for _, x in { -12, -6 } do
		Build.Box(m, at(base, x, F + 1.8, 10), Vector3.new(4, 3.6, 3), C.Metal, Enum.Material.DiamondPlate)
		Build.Box(m, at(base, x, F + 3.65, 10), Vector3.new(3.2, 0.1, 2.2), rgb(230, 170, 40), Enum.Material.Neon)
	end
	local board = Build.Box(m, at(base, -4, 8, d / 2 - 1.15), Vector3.new(16, 4, 0.2), C.Black)
	Build.Sign(board, "MENU\nFriet • Burger • Frikandel\nCola • IJsje", C.Yellow)
	local locker = Build.Box(m, at(base, 15, F + 3, 10), Vector3.new(3, 6, 2), C.Metal, Enum.Material.Metal)
	addRolePrompt(locker, "Werk hier", "Snackbar", "Snackbar")

	tableFurniture(m, at(base, 10, F, -6), 5, 4)
	chair(m, at(base, 10, F, -9.2) * CFrame.Angles(0, math.pi, 0))
	chair(m, at(base, 10, F, -2.8))

	-- terras met parasols
	for i, x in { -12, 0, 12 } do
		local spot = at(base, x, 0, -28)
		tableFurniture(m, spot, 4, 4)
		chair(m, at(spot, 0, 0, -3.2) * CFrame.Angles(0, math.pi, 0))
		chair(m, at(spot, 0, 0, 3.2))
		Build.Cylinder(m, at(spot, 0, 5, 0), 7, 0.3, C.White)
		Build.Cylinder(m, at(spot, 0, 8.5, 0), 0.4, 8, i % 2 == 0 and C.Yellow or C.Red)
	end
end

local function officeTower(parent: Instance, bx: number, bz: number)
	local m = newModel("Kantoor", parent)
	local base = CFrame.new(bx, G, bz) * CFrame.Angles(0, math.pi, 0)
	local w, d, fh, floors = 40, 40, 12, 4
	local wallColor = rgb(70, 82, 100)

	local function floorY(i: number): number
		return i < floors and i * fh + F or floors * fh + 1
	end

	local panels = {}
	for i = 0, floors - 1 do
		local y = i * fh
		local fb = at(base, 0, y, 0)
		local front = Build.Windows(w, 5, 6, 2, 10, i == 0 and { 0 } or nil)
		if i == 0 then
			table.insert(front, { x = 0, w = 8, bottom = 0, top = 9, glass = false })
		end
		Build.Box(m, at(fb, 0, 0.2, 0), Vector3.new(w, 0.4, d), rgb(190, 195, 200), Enum.Material.Slate)
		Build.Wall(m, at(fb, 0, 0, -d / 2 + 0.5), w, fh, front, wallColor)
		Build.Wall(m, at(fb, 0, 0, d / 2 - 0.5) * CFrame.Angles(0, math.pi, 0), w, fh, Build.Windows(w, 5, 6, 2, 10, { 14 }), wallColor)
		Build.Wall(m, at(fb, -w / 2 + 0.5, 0, 0) * CFrame.Angles(0, math.pi / 2, 0), d - 2, fh, Build.Windows(d - 2, 5, 5, 2, 10), wallColor)
		Build.Wall(m, at(fb, w / 2 - 0.5, 0, 0) * CFrame.Angles(0, -math.pi / 2, 0), d - 2, fh, Build.Windows(d - 2, 5, 5, 2, 10), wallColor)
		ceilingLight(m, at(fb, 0, fh - 0.1, 0))

		for _, x in { -10, 10 } do
			for _, z in { -6, 6 } do
				desk(m, at(fb, x, F, z))
			end
		end
		plant(m, at(fb, 16, F, -16))

		-- liftknoppen tegen de achtermuur
		local panel = Build.Box(m, at(fb, -14, 4, d / 2 - 1.15), Vector3.new(3, 5, 0.3), C.Metal, Enum.Material.Metal)
		panels[i] = panel
	end

	-- dak met helikopterplatform
	local roofY = floors * fh
	Build.Box(m, at(base, 0, roofY + 0.5, 0), Vector3.new(w + 1, 1, d + 1), rgb(90, 95, 100), Enum.Material.Concrete)
	for _, s in { -1, 1 } do
		Build.Box(m, at(base, 0, roofY + 2.5, s * (d / 2)), Vector3.new(w + 1, 3, 0.6), wallColor)
		Build.Box(m, at(base, s * (w / 2), roofY + 2.5, 0), Vector3.new(0.6, 3, d + 1), wallColor)
	end
	Build.Cylinder(m, at(base, 4, roofY + 1.05, -4), 0.1, 22, C.Black)
	Build.Box(m, at(base, 4 - 3, roofY + 1.12, -4), Vector3.new(1.2, 0.05, 8), C.Yellow)
	Build.Box(m, at(base, 4 + 3, roofY + 1.12, -4), Vector3.new(1.2, 0.05, 8), C.Yellow)
	Build.Box(m, at(base, 4, roofY + 1.12, -4), Vector3.new(5, 0.05, 1.2), C.Yellow)
	Build.Box(m, at(base, -14, roofY + 4, d / 2 - 4), Vector3.new(7, 6, 6), wallColor)
	panels[floors] = Build.Box(m, at(base, -14, roofY + 3.5, d / 2 - 7.15), Vector3.new(3, 4, 0.3), C.Metal, Enum.Material.Metal)

	bigSign(m, at(base, 0, roofY - 3, -d / 2 - 0.4), Vector3.new(18, 3, 0.4), "KANTOOR", wallColor, C.White)

	-- lift: E = omhoog, R = omlaag
	for level, panel in panels do
		local function target(to: number): CFrame
			local z = to == floors and d / 2 - 10 or d / 2 - 4
			return at(base, -14, floorY(to) + 3, z) * CFrame.Angles(0, math.pi, 0)
		end
		local function makePrompt(text: string, key: Enum.KeyCode, pad: Enum.KeyCode, to: number)
			local prompt = Build.Prompt(panel, text, "Lift (verdieping " .. level .. ")", 8)
			prompt.KeyboardKeyCode = key
			prompt.GamepadKeyCode = pad
			prompt.Triggered:Connect(function(player)
				local character = player.Character
				if character then
					character:PivotTo(target(to))
				end
			end)
		end
		if level < floors then
			makePrompt(level + 1 == floors and "Naar het dak" or "Omhoog", Enum.KeyCode.E, Enum.KeyCode.ButtonX, level + 1)
		end
		if level > 0 then
			makePrompt("Omlaag", Enum.KeyCode.R, Enum.KeyCode.ButtonB, level - 1)
		end
	end

	local reception = counter(m, at(base, 8, F, -12), 10, rgb(230, 230, 230))
	addRolePrompt(reception, "Werk hier", "Kantoor", "Kantoor")

	-- pad en bomen voor de deur
	Build.Box(m, at(base, 0, 0.05, -d / 2 - 20), Vector3.new(8, 0.1, 40), C.Sidewalk, Enum.Material.Concrete)
	for _, x in { -14, 14 } do
		tree(m, (at(base, x, 0, -d / 2 - 18)).Position)
	end
end

local function carDealer(parent: Instance, bx: number, bz: number)
	local m = newModel("Autodealer", parent)
	local base = CFrame.new(bx - 20, G, bz) * CFrame.Angles(0, -math.pi / 2, 0)
	local w, d, h = 50, 30, 12

	shell(m, base, w, d, h, {
		Color = rgb(235, 235, 240),
		Front = {
			{ x = -18, w = 6, bottom = 0, top = 9, glass = false },
			{ x = 6, w = 32, bottom = 1, top = 10.5, glass = true },
		},
		Sides = Build.Windows(d - 2, 2, 8, 2, 10),
		Roof = rgb(200, 40, 40),
		Floor = rgb(230, 230, 235),
		FloorMaterial = Enum.Material.Marble,
	})
	bigSign(m, at(base, 0, h + 2.5, -d / 2 + 1), Vector3.new(24, 3.5, 0.6), "AUTODEALER", rgb(200, 40, 40), C.White)

	-- showroom met 2 auto's
	local showcase = {
		{ Id = "Sportwagen", X = -8, Color = rgb(200, 30, 40) },
		{ Id = "Supercar", X = 12, Color = rgb(240, 200, 30) },
	}
	for _, car in showcase do
		local spot = at(base, car.X, F, 2) * CFrame.Angles(0, 0.5, 0)
		Build.Cylinder(m, at(spot, 0, 0.2, 0), 0.4, 18, rgb(60, 60, 65), Enum.Material.Metal)
		local model = VehicleBuilder.Build(Config.GetVehicle(car.Id), car.Color, at(spot, 0, 0.4, 0), true)
		model.Parent = m
	end

	-- parkeerterrein met garages
	Build.Box(m, at(base, 0, 0.05, -48), Vector3.new(116, 0.1, 60), C.Asphalt, Enum.Material.Asphalt)
	for _, x in { -42, -14, 14, 42 } do
		local cf = at(base, x, 0.1, -50)
		vehiclePad(m, cf)
		table.insert(world.VehiclePads, cf)
	end
	local info = bigSign(m, at(base, 0, 4, -24), Vector3.new(14, 3, 0.4), "🚗 Kies hier je voertuig!", C.Black, C.White)
	info.CanCollide = false
	Build.Box(m, at(base, 0, 1.25, -24), Vector3.new(0.6, 2.5, 0.6), C.Metal)
end

local function outskirts(parent: Instance)
	local m = newModel("Bomen", parent)
	local placed = 0
	while placed < 80 do
		local x = rng:NextNumber(-HALF_MAP + 8, HALF_MAP - 8)
		local z = rng:NextNumber(-HALF_MAP + 8, HALF_MAP - 8)
		local outside = math.abs(x) > 262 or math.abs(z) > 262
		local onRoad = false
		for _, r in ROADS do
			if math.abs(x - r) < ROAD_W / 2 + 5 or math.abs(z - r) < ROAD_W / 2 + 5 then
				onRoad = true
			end
		end
		if outside and not onRoad then
			tree(m, Vector3.new(x, 0, z), rng:NextNumber(0.8, 1.4))
			placed += 1
		end
	end
end

------------------------------------------------------------------------

function WorldBuilder.Build()
	local map = Instance.new("Folder")
	map.Name = "Stad"

	world.Ground = Build.Box(map, CFrame.new(0, -1, 0), Vector3.new(HALF_MAP * 2, 2, HALF_MAP * 2), C.Grass, Enum.Material.Grass)
	world.Ground.Name = "Grond"

	buildRoads(map)

	for _, bx in { -160, 0, 160 } do
		for _, bz in { -160, 0, 160 } do
			if bx == 0 and bz == 0 then
				buildBlock(map, bx, bz, C.Plaza, Enum.Material.Pavement)
			else
				buildBlock(map, bx, bz, C.Lawn, Enum.Material.Grass)
			end
		end
	end

	local buildings = newModel("Gebouwen", map)
	plaza(buildings)
	policeStation(buildings, -160, -160)
	snackbar(buildings, 0, -160)
	officeTower(buildings, 160, -160)
	carDealer(buildings, -160, 0)

	local homes = newModel("Huizen", map)
	houseBlock(homes, 160, 0, "Lindelaan")
	houseBlock(homes, -160, 160, "Eikenweg")
	houseBlock(homes, 0, 160, "Berkenhof")
	villa(homes, CFrame.new(160, G, 130), "Villa Zonneheuvel 1")
	villa(homes, CFrame.new(160, G, 190) * CFrame.Angles(0, math.pi, 0), "Villa Zonneheuvel 2")

	outskirts(map)

	map.Parent = Workspace
	return world
end

return WorldBuilder
