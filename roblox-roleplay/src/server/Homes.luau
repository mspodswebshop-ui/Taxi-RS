--[[
	Homes: moderne huizen (2 verdiepingen, trap, balkon, garage) en grote villa's
	met zwembad, basketbalveld en een supercar in de garage.

	Elk huis staat op een perceel van 78 x 78. plot = midden van het perceel op
	grasniveau, de voorkant (straatkant) is -Z.
]]

local Workspace = game:GetService("Workspace")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = require(Shared.Config)
local Build = require(script.Parent.Build)
local Furniture = require(script.Parent.Furniture)
local Doors = require(script.Parent.Doors)
local VehicleBuilder = require(script.Parent.VehicleBuilder)

local Homes = {}

local at = Furniture.At
local C = Furniture.Colors

local function rgb(r: number, g: number, b: number): Color3
	return Color3.fromRGB(r, g, b)
end

local function rot(angle: number): CFrame
	return CFrame.Angles(0, angle, 0)
end

local PI = math.pi
local M = Enum.Material

local THEMES = {
	{
		Ground = rgb(245, 245, 242), GroundMat = M.SmoothPlastic,
		Upper = rgb(150, 104, 68), UpperMat = M.WoodPlanks,
		Garage = rgb(62, 64, 70), GarageMat = M.Slate,
		Roof = rgb(48, 48, 52), Accent = rgb(48, 48, 52),
		Door = rgb(40, 40, 44), GarageDoor = rgb(70, 72, 78),
		Floor = rgb(205, 175, 135), Sofa = rgb(110, 110, 115), Kid = rgb(90, 150, 220),
	},
	{
		Ground = rgb(72, 74, 80), GroundMat = M.Slate,
		Upper = rgb(242, 242, 238), UpperMat = M.SmoothPlastic,
		Garage = rgb(242, 242, 238), GarageMat = M.SmoothPlastic,
		Roof = rgb(40, 40, 44), Accent = rgb(160, 115, 75),
		Door = rgb(160, 115, 75), GarageDoor = rgb(230, 230, 230),
		Floor = rgb(190, 160, 120), Sofa = rgb(225, 215, 195), Kid = rgb(230, 120, 160),
	},
	{
		Ground = rgb(196, 150, 118), GroundMat = M.Brick,
		Upper = rgb(58, 58, 64), UpperMat = M.SmoothPlastic,
		Garage = rgb(196, 150, 118), GarageMat = M.Brick,
		Roof = rgb(38, 38, 42), Accent = rgb(235, 235, 235),
		Door = rgb(30, 30, 34), GarageDoor = rgb(58, 58, 64),
		Floor = rgb(215, 190, 150), Sofa = rgb(70, 95, 150), Kid = rgb(120, 190, 110),
	},
	{
		Ground = rgb(222, 222, 216), GroundMat = M.Concrete,
		Upper = rgb(42, 42, 46), UpperMat = M.WoodPlanks,
		Garage = rgb(222, 222, 216), GarageMat = M.Concrete,
		Roof = rgb(35, 35, 38), Accent = rgb(42, 42, 46),
		Door = rgb(170, 120, 80), GarageDoor = rgb(42, 42, 46),
		Floor = rgb(200, 185, 160), Sofa = rgb(150, 70, 60), Kid = rgb(250, 190, 60),
	},
	{
		Ground = rgb(240, 232, 214), GroundMat = M.SmoothPlastic,
		Upper = rgb(126, 156, 186), UpperMat = M.WoodPlanks,
		Garage = rgb(240, 232, 214), GarageMat = M.SmoothPlastic,
		Roof = rgb(60, 60, 66), Accent = rgb(240, 240, 240),
		Door = rgb(126, 156, 186), GarageDoor = rgb(240, 240, 240),
		Floor = rgb(210, 180, 140), Sofa = rgb(80, 120, 90), Kid = rgb(170, 110, 220),
	},
}

local WHITE = rgb(246, 246, 244)

local houseCount = 0

-- Bel/paneel naast de voordeur: hier claim je het huis en doe je het op slot (toets F)
local function doorPanel(m: Instance, cf: CFrame): (Part, Part)
	local panel = Build.Box(m, cf, Vector3.new(1.2, 1.8, 0.3), C.Black, M.Metal)
	panel.Name = "Deurbel"
	local light = Build.Box(m, cf * CFrame.new(0, 0.45, -0.18), Vector3.new(0.6, 0.35, 0.05), rgb(40, 220, 80), M.Neon)
	Build.Box(m, cf * CFrame.new(0, -0.3, -0.18), Vector3.new(0.5, 0.5, 0.05), rgb(200, 200, 205), M.Metal)
	return panel, light
end

local function mailbox(m: Instance, cf: CFrame): TextLabel
	Build.Box(m, at(cf, 0, 1.6, 0), Vector3.new(0.4, 3.2, 0.4), C.Black, M.Metal)
	Build.Box(m, at(cf, 0, 3.6, 0), Vector3.new(1.4, 1, 2), C.Black, M.Metal)
	local board = Build.Box(m, at(cf, 0, 5, 0), Vector3.new(6, 1.6, 0.3), WHITE)
	return Build.Sign(board, "Te koop", C.Black)
end

local function wallLamp(m: Instance, cf: CFrame)
	local lamp = Build.Box(m, cf, Vector3.new(0.6, 1.1, 0.4), rgb(255, 235, 200), M.Neon)
	Build.Light(lamp, rgb(255, 220, 170), 14, 0.9)
end

local function register(world: any, info: any)
	houseCount += 1
	local prompt = Build.Prompt(info.Panel, "Claim huis", info.Name, 8)
	prompt.KeyboardKeyCode = Enum.KeyCode.F
	prompt.GamepadKeyCode = Enum.KeyCode.ButtonY
	info.Id = "Huis" .. houseCount
	info.Prompt = prompt
	table.insert(world.Houses, info)
end

local function pos(cf: CFrame, x: number, y: number, z: number): Vector3
	return (cf * CFrame.new(x, y, z)).Position
end

-- Rand tussen twee verdiepingen (moderne look)
local function band(m: Instance, base: CFrame, y: number, w: number, d: number, color: Color3)
	Build.Box(m, at(base, 0, y, -d / 2 - 0.05), Vector3.new(w + 0.8, 0.8, 0.5), color)
	Build.Box(m, at(base, 0, y, d / 2 + 0.05), Vector3.new(w + 0.8, 0.8, 0.5), color)
	Build.Box(m, at(base, -w / 2 - 0.05, y, 0), Vector3.new(0.5, 0.8, d + 0.8), color)
	Build.Box(m, at(base, w / 2 + 0.05, y, 0), Vector3.new(0.5, 0.8, d + 0.8), color)
end

local function flatRoof(m: Instance, base: CFrame, y: number, w: number, d: number, color: Color3)
	Build.Box(m, at(base, 0, y + 0.4, 0), Vector3.new(w + 2, 0.8, d + 2), color)
	for _, s in { -1, 1 } do
		Build.Box(m, at(base, 0, y + 1.2, s * (d / 2 + 0.75)), Vector3.new(w + 2, 0.8, 0.5), color)
		Build.Box(m, at(base, s * (w / 2 + 0.75), y + 1.2, 0), Vector3.new(0.5, 0.8, d + 2), color)
	end
end

------------------------------------------------------------------------
-- Gewoon huis
------------------------------------------------------------------------

function Homes.House(parent: Instance, plot: CFrame, name: string, index: number, world: any)
	local m = Instance.new("Model")
	m.Name = name
	m.Parent = parent

	local t = THEMES[(index - 1) % #THEMES + 1]
	local base = at(plot, -8, 0, -4)
	local W, D, FH = 40, 30, 12
	local hw, hd = W / 2, D / 2
	local F0, F1 = 0.4, FH

	-- begane grond
	Build.Box(m, at(base, 0, 0.2, 0), Vector3.new(W, 0.4, D), t.Floor, M.WoodPlanks)
	Build.Wall(m, at(base, 0, 0, -hd + 0.5), W, FH, {
		{ x = -12, w = 5, bottom = 0, top = 9, glass = false },
		{ x = 5, w = 16, bottom = 1.2, top = 10, glass = true },
		{ x = -17.5, w = 3, bottom = 3, top = 9, glass = true },
	}, t.Ground, t.GroundMat)
	Build.Wall(m, at(base, 0, 0, hd - 0.5) * rot(PI), W, FH, {
		{ x = 6, w = 12, bottom = 0, top = 9, glass = false },
		{ x = 16, w = 3, bottom = 3, top = 9, glass = true },
	}, t.Ground, t.GroundMat)
	Build.Wall(m, at(base, -hw + 0.5, 0, 0) * rot(PI / 2), D - 2, FH, Build.Windows(D - 2, 3, 4, 3, 9), t.Ground, t.GroundMat)
	Build.Wall(m, at(base, hw - 0.5, 0, 0) * rot(-PI / 2), D - 2, FH, {
		{ x = 6, w = 4, bottom = 0, top = 8.5, glass = false },
	}, t.Ground, t.GroundMat)

	-- eerste verdieping
	Build.FloorWithHole(m, at(base, 0, FH, 0), W, D, { x = -17, w = 4, z = 4, d = 16 }, t.Floor, M.WoodPlanks)
	band(m, base, FH, W, D, t.Accent)
	Build.Wall(m, at(base, 0, FH, -hd + 0.5), W, FH, {
		{ x = -13, w = 7, bottom = 2.5, top = 9.5, glass = true },
		{ x = -4, w = 4, bottom = 2.5, top = 9.5, glass = true },
		{ x = 8, w = 6, bottom = 0, top = 9, glass = false },
	}, t.Upper, t.UpperMat)
	Build.Wall(m, at(base, 0, FH, hd - 0.5) * rot(PI), W, FH, Build.Windows(W, 4, 5, 3, 9), t.Upper, t.UpperMat)
	Build.Wall(m, at(base, -hw + 0.5, FH, 0) * rot(PI / 2), D - 2, FH, Build.Windows(D - 2, 2, 5, 3, 9), t.Upper, t.UpperMat)
	Build.Wall(m, at(base, hw - 0.5, FH, 0) * rot(-PI / 2), D - 2, FH, Build.Windows(D - 2, 3, 5, 3, 9), t.Upper, t.UpperMat)
	flatRoof(m, base, FH * 2, W, D, t.Roof)

	-- binnenmuren boven
	Build.Wall(m, at(base, 2, FH, 0) * rot(PI / 2), D - 2, FH, { { x = 0, w = 3.5, bottom = 0, top = 8.5 } }, WHITE, nil, 0.5)
	Build.Wall(m, at(base, -8.5, FH, -5), 21, FH, { { x = -4.5, w = 3.5, bottom = 0, top = 8.5 } }, WHITE, nil, 0.5)
	Build.Wall(m, at(base, -11, FH, 9.5) * rot(PI / 2), 9, FH, { { x = 0.5, w = 3.5, bottom = 0, top = 8.5 } }, WHITE, nil, 0.5)
	Build.Wall(m, at(base, -4.5, FH, 5), 13, FH, {}, WHITE, nil, 0.5)

	-- trap met reling
	Build.Stairs(m, at(base, -17, F0, -4), 4, FH - F0, 16, t.Floor, M.Wood)
	Build.Railing(m, pos(base, -15, FH, -4), pos(base, -15, FH, 11))
	Build.Railing(m, pos(base, -19, FH, -4), pos(base, -15, FH, -4))

	-- balkon
	Build.Box(m, at(base, 9, FH - 0.3, -hd - 3), Vector3.new(18, 0.6, 6), t.Accent)
	Build.Railing(m, pos(base, 0, FH, -hd - 6), pos(base, 18, FH, -hd - 6))
	Build.Railing(m, pos(base, 0, FH, -hd), pos(base, 0, FH, -hd - 6))
	Build.Railing(m, pos(base, 18, FH, -hd), pos(base, 18, FH, -hd - 6))
	Furniture.Chair(m, at(base, 12, FH, -hd - 3), WHITE)
	Furniture.Chair(m, at(base, 15, FH, -hd - 3), WHITE)
	Furniture.Plant(m, at(base, 2, FH, -hd - 4.5))

	-- garage
	Build.Box(m, at(base, 28, 0.2, -3), Vector3.new(16, 0.4, 24), rgb(150, 150, 150), M.Concrete)
	Build.Wall(m, at(base, 28, 0, -hd + 0.5), 16, 11, { { x = 0, w = 12, bottom = 0, top = 9, glass = false } }, t.Garage, t.GarageMat)
	Build.Wall(m, at(base, 35.5, 0, -3) * rot(-PI / 2), 22, 11, { { x = 0, w = 4, bottom = 4, top = 8, glass = true } }, t.Garage, t.GarageMat)
	Build.Wall(m, at(base, 28, 0, 8.5) * rot(PI), 16, 11, {}, t.Garage, t.GarageMat)
	Build.Box(m, at(base, 28.5, 11.4, -3), Vector3.new(17.4, 0.8, 25), t.Roof)
	Furniture.Table(m, at(base, 28, F0, 6.5), 8, 2.5, rgb(120, 120, 125), M.DiamondPlate)
	Furniture.CeilingLight(m, at(base, 28, 10.8, -3), 20)

	-- deuren
	local front = Doors.Create(m, at(base, -12, F0, -hd + 0.5), 5, 8.6, { Style = "Swing", Color = t.Door, Name = "Voordeur" })
	local back = Doors.Create(m, at(base, -6, F0, hd - 0.5) * rot(PI), 12, 8.6, { Style = "Slide", Glass = true, SlideDir = -1, Name = "Schuifpui" })
	local balcony = Doors.Create(m, at(base, 8, FH, -hd + 0.5), 6, 9, { Style = "Slide", Glass = true, Name = "Balkondeur" })
	local garage = Doors.Create(m, at(base, 28, F0, -hd + 0.5), 12, 8.6, { Style = "Up", Color = t.GarageDoor, Material = M.Metal, Name = "Garage" })
	local inner = Doors.Create(m, at(base, hw - 0.5, F0, 6) * rot(PI / 2), 4, 8.1, { Style = "Swing", Color = WHITE, Material = M.SmoothPlastic, Name = "Garagedeur" })

	-- entree
	Build.Box(m, at(base, -12, 9.8, -hd - 1.6), Vector3.new(8, 0.4, 3.4), t.Accent)
	wallLamp(m, at(base, -15.3, 6.5, -hd - 0.25))
	wallLamp(m, at(base, -8.7, 6.5, -hd - 0.25))
	local panel, lockLight = doorPanel(m, at(base, -15.4, 4.2, -hd - 0.15))

	-- woonkamer
	Furniture.Rug(m, at(base, 12, F0, -6), 10, 12, rgb(215, 205, 185))
	Furniture.Sofa(m, at(base, 7, F0, -6) * rot(-PI / 2), 10, t.Sofa)
	Furniture.CoffeeTable(m, at(base, 12.5, F0, -6) * rot(PI / 2))
	Furniture.TV(m, at(base, 18.2, F0, -6) * rot(PI / 2))
	Furniture.FloorLamp(m, at(base, 5.5, F0, -12.8))
	Furniture.Plant(m, at(base, 17.5, F0, -12.8), true)
	Furniture.Plant(m, at(base, -17.5, F0, -12.5))

	-- keuken en eettafel
	Furniture.Kitchen(m, at(base, 10, F0, 13.1), 12)
	Furniture.Fridge(m, at(base, 17.6, F0, 12.8))
	Furniture.Island(m, at(base, 8, F0, 5), 8)
	Furniture.DiningSet(m, at(base, -6, F0, 4), 2)
	for _, p in { Vector3.new(10, 0, -6), Vector3.new(-6, 0, 4), Vector3.new(-12, 0, -10) } do
		Furniture.CeilingLight(m, at(base, p.X, FH - 0.7, p.Z))
	end

	-- slaapkamer ouders
	Furniture.Bed(m, at(base, 11, F1, 8.5), t.Sofa, true)
	Furniture.Wardrobe(m, at(base, 3.6, F1, -9) * rot(-PI / 2))
	Furniture.Desk(m, at(base, 15, F1, -12.3) * rot(PI))
	Furniture.Rug(m, at(base, 11, F1, -2), 10, 8, rgb(230, 225, 215))
	-- kinderkamer
	Furniture.Bed(m, at(base, -13.8, F1, -9.6) * rot(-PI / 2), t.Kid, false, true)
	Furniture.Desk(m, at(base, -3, F1, -12.3) * rot(PI))
	Furniture.Rug(m, at(base, -8, F1, -9.5), 6, 6, t.Kid)
	-- badkamer
	Furniture.Bathtub(m, at(base, -5, F1, 11.6) * rot(PI / 2))
	Furniture.Sink(m, at(base, -4, F1, 6.2) * rot(PI))
	Furniture.Toilet(m, at(base, 0.4, F1, 9) * rot(PI / 2))
	-- overloop
	Furniture.TV(m, at(base, -5, F1, -3.9) * rot(PI))
	Furniture.Sofa(m, at(base, -5, F1, 2.2), 7, t.Sofa)
	for _, p in { Vector3.new(11, 0, 0), Vector3.new(-8, 0, -9.5), Vector3.new(-5, 0, 9.5), Vector3.new(-5, 0, 0) } do
		Furniture.CeilingLight(m, at(base, p.X, FH * 2 - 0.7, p.Z))
	end

	-- tuin voor
	Build.Box(m, at(plot, 20, 0.05, -29), Vector3.new(12, 0.1, 20), rgb(170, 170, 170), M.Concrete)
	Build.Box(m, at(plot, -20, 0.05, -29), Vector3.new(4, 0.1, 20), rgb(200, 195, 185), M.Pavement)
	local sign = mailbox(m, at(plot, -26, 0, -36))
	Furniture.Hedge(m, at(plot, -31, 0, -37.5), 14, 1.6)
	Furniture.Hedge(m, at(plot, -2, 0, -37.5), 30, 1.6)
	Furniture.Hedge(m, at(plot, 32, 0, -37.5), 10, 1.6)
	Furniture.Hedge(m, at(plot, 38, 0, 0) * rot(PI / 2), 74, 2.6)
	Furniture.Hedge(m, at(plot, -38, 0, 0) * rot(PI / 2), 74, 2.6)
	Furniture.Flowerbed(m, at(plot, -6, 0, -21.5), 10, 2.5)
	Furniture.Tree(m, pos(plot, -30, 0, -26), 0.9)

	-- tuin achter
	Build.Box(m, at(base, -6, 0.15, 20), Vector3.new(26, 0.3, 10), rgb(150, 110, 75), M.WoodPlanks)
	Furniture.Table(m, at(base, -12, 0.3, 20.5), 5, 4)
	Furniture.Chair(m, at(base, -12, 0.3, 17.6) * rot(PI), WHITE)
	Furniture.Chair(m, at(base, -12, 0.3, 23.4), WHITE)
	Furniture.Parasol(m, at(base, -12, 0.3, 20.5), t.Kid)
	Furniture.BBQ(m, at(base, 4, 0.3, 22))
	Furniture.Tree(m, pos(plot, -26, 0, 32))
	Furniture.Tree(m, pos(plot, 26, 0, 30), 1.1)
	Furniture.Hedge(m, at(plot, 0, 0, 37.5), 74, 2.6)

	register(world, {
		Name = name,
		Premium = false,
		Doors = { front, back, balcony, garage, inner },
		Panel = panel,
		LockLight = lockLight,
		Sign = sign,
		Entrance = at(base, -12, 0, -hd - 5) * rot(PI),
	})
end

------------------------------------------------------------------------
-- Villa
------------------------------------------------------------------------

local function bigGoldSign(m: Instance, cf: CFrame, text: string)
	local sign = Build.Box(m, cf, Vector3.new(10, 2, 0.3), rgb(30, 30, 34))
	Build.Sign(sign, "👑 " .. text, rgb(235, 190, 60))
end

local VILLA_THEMES = {
	{ Ground = rgb(246, 246, 244), GroundMat = M.SmoothPlastic, Upper = rgb(150, 104, 68), UpperMat = M.WoodPlanks, Accent = rgb(40, 40, 44), Car = rgb(240, 200, 30) },
	{ Ground = rgb(58, 60, 66), GroundMat = M.Slate, Upper = rgb(246, 246, 244), UpperMat = M.SmoothPlastic, Accent = rgb(200, 160, 60), Car = rgb(200, 30, 40) },
}

function Homes.Villa(parent: Instance, plot: CFrame, name: string, index: number, world: any)
	local m = Instance.new("Model")
	m.Name = name
	m.Parent = parent

	local t = VILLA_THEMES[(index - 1) % #VILLA_THEMES + 1]
	local base = at(plot, -12, 0, -8)
	local W, D, FH = 64, 36, 13
	local hw, hd = W / 2, D / 2
	local F0, F1 = 0.4, FH
	local floorColor = rgb(232, 230, 226)

	-- gras met een gat voor het zwembad
	local poolX, poolZ, poolW, poolD = -20, 24, 38, 16
	Build.FloorWithHole(m, plot, 156, 78, { x = poolX, w = poolW + 3, z = poolZ, d = poolD + 3 }, rgb(104, 172, 82), M.Grass)

	-- begane grond
	Build.Box(m, at(base, 0, 0.2, 0), Vector3.new(W, 0.4, D), floorColor, M.Marble)
	Build.Wall(m, at(base, 0, 0, -hd + 0.5), W, FH, {
		{ x = -22, w = 16, bottom = 1, top = 12, glass = true },
		{ x = -4, w = 6, bottom = 0, top = 10.5, glass = false },
		{ x = 5, w = 6, bottom = 3, top = 10, glass = true },
		{ x = 23, w = 14, bottom = 0, top = 10, glass = false },
	}, t.Ground, t.GroundMat)
	Build.Wall(m, at(base, 0, 0, hd - 0.5) * rot(PI), W, FH, {
		{ x = 22, w = 16, bottom = 0.4, top = 12, glass = true },
		{ x = 8, w = 10, bottom = 0, top = 10, glass = false },
		{ x = -23, w = 4, bottom = 4, top = 9, glass = true },
	}, t.Ground, t.GroundMat)
	Build.Wall(m, at(base, -hw + 0.5, 0, 0) * rot(PI / 2), D - 2, FH, Build.Windows(D - 2, 3, 6, 2, 11), t.Ground, t.GroundMat)
	Build.Wall(m, at(base, hw - 0.5, 0, 0) * rot(-PI / 2), D - 2, FH, Build.Windows(D - 2, 2, 4, 4, 10), t.Ground, t.GroundMat)
	Build.Wall(m, at(base, 14, 0, 0) * rot(PI / 2), D - 2, FH, { { x = -10, w = 4, bottom = 0, top = 9 } }, WHITE, nil, 0.5)

	-- eerste verdieping
	Build.FloorWithHole(m, at(base, 0, FH, 0), W, D, { x = 11.5, w = 4, z = -4, d = 16 }, floorColor, M.WoodPlanks)
	band(m, base, FH, W, D, t.Accent)
	Build.Wall(m, at(base, 0, FH, -hd + 0.5), W, FH, {
		{ x = -19, w = 6, bottom = 0, top = 10, glass = false },
		{ x = -9, w = 8, bottom = 2, top = 11, glass = true },
		{ x = 4, w = 10, bottom = 2, top = 11, glass = true },
		{ x = 23, w = 12, bottom = 2, top = 11, glass = true },
	}, t.Upper, t.UpperMat)
	Build.Wall(m, at(base, 0, FH, hd - 0.5) * rot(PI), W, FH, {
		{ x = 19, w = 14, bottom = 2, top = 11, glass = true },
		{ x = -2, w = 6, bottom = 6, top = 10, glass = true },
	}, t.Upper, t.UpperMat)
	Build.Wall(m, at(base, -hw + 0.5, FH, 0) * rot(PI / 2), D - 2, FH, Build.Windows(D - 2, 3, 6, 2, 11), t.Upper, t.UpperMat)
	Build.Wall(m, at(base, hw - 0.5, FH, 0) * rot(-PI / 2), D - 2, FH, {}, t.Upper, t.UpperMat)
	flatRoof(m, base, FH * 2, W, D, rgb(45, 45, 50))
	for i = 0, 3 do
		Build.Box(m, at(base, -20 + i * 7, FH * 2 + 2, 4) * CFrame.Angles(-0.35, 0, 0), Vector3.new(6, 0.2, 8), rgb(30, 45, 90), M.Glass)
	end

	-- binnenmuren boven
	Build.Wall(m, at(base, -6, FH, 0) * rot(PI / 2), D - 2, FH, { { x = 0, w = 4, bottom = 0, top = 9 } }, WHITE, nil, 0.5)
	Build.Wall(m, at(base, 1, FH, 6), 14, FH, { { x = 1, w = 4, bottom = 0, top = 9 } }, WHITE, nil, 0.5)
	Build.Wall(m, at(base, 8, FH, 11.5) * rot(PI / 2), 11, FH, {}, WHITE, nil, 0.5)
	Build.Wall(m, at(base, 14, FH, 0) * rot(PI / 2), D - 2, FH, { { x = -10, w = 4, bottom = 0, top = 9 } }, WHITE, nil, 0.5)

	-- trap
	Build.Stairs(m, at(base, 11.5, F0, -12), 4, FH - F0, 16, rgb(240, 240, 240), M.Marble)
	Build.Railing(m, pos(base, 9.5, FH, -12), pos(base, 9.5, FH, 3))
	Build.Railing(m, pos(base, 9.5, FH, -12), pos(base, 13.5, FH, -12))

	-- balkon
	Build.Box(m, at(base, -15, FH - 0.3, -hd - 3), Vector3.new(22, 0.6, 6), t.Accent)
	Build.Railing(m, pos(base, -26, FH, -hd - 6), pos(base, -4, FH, -hd - 6))
	Build.Railing(m, pos(base, -26, FH, -hd), pos(base, -26, FH, -hd - 6))
	Build.Railing(m, pos(base, -4, FH, -hd), pos(base, -4, FH, -hd - 6))
	Furniture.Sunbed(m, at(base, -11, FH, -hd - 3) * rot(PI / 2))
	Furniture.Plant(m, at(base, -24.5, FH, -hd - 4.5), true)

	-- deuren
	local front = Doors.Create(m, at(base, -4, F0, -hd + 0.5), 6, 10.1, { Style = "Swing", Color = rgb(35, 35, 38), Name = "Voordeur" })
	local back = Doors.Create(m, at(base, -8, F0, hd - 0.5) * rot(PI), 10, 9.6, { Style = "Slide", Glass = true, SlideDir = -1, Name = "Schuifpui" })
	local garage = Doors.Create(m, at(base, 23, F0, -hd + 0.5), 14, 9.6, { Style = "Up", Color = rgb(60, 62, 68), Material = M.Metal, Name = "Garage" })
	local balcony = Doors.Create(m, at(base, -19, FH, -hd + 0.5), 6, 10, { Style = "Slide", Glass = true, SlideDir = -1, Name = "Balkondeur" })
	local garageInner = Doors.Create(m, at(base, 14, F0, 10) * rot(PI / 2), 4, 8.6, { Style = "Swing", Color = WHITE, Material = M.SmoothPlastic, Name = "Garagedeur" })

	-- entree
	Build.Box(m, at(base, -4, 11, -hd - 2.5), Vector3.new(12, 0.5, 5), t.Accent)
	wallLamp(m, at(base, -8.2, 7, -hd - 0.25))
	wallLamp(m, at(base, 0.2, 7, -hd - 0.25))
	local panel, lockLight = doorPanel(m, at(base, -8.2, 4.2, -hd - 0.15))
	bigGoldSign(m, at(base, -22, FH - 1.6, -hd - 0.4), "VILLA")

	-- woonkamer
	Furniture.Rug(m, at(base, -24, F0, 2), 14, 12, rgb(235, 230, 220))
	Furniture.CornerSofa(m, at(base, -20, F0, 2) * rot(PI / 2), 12, rgb(240, 240, 238))
	Furniture.CoffeeTable(m, at(base, -25.5, F0, 2) * rot(PI / 2))
	Furniture.TV(m, at(base, -30.3, F0, 2) * rot(-PI / 2), true)
	Furniture.Piano(m, at(base, -26, F0, -11))
	Furniture.Bookshelf(m, at(base, -30.3, F0, 12) * rot(-PI / 2), 6)
	Furniture.Plant(m, at(base, -10, F0, -15), true)
	Furniture.Plant(m, at(base, 2, F0, -15), true)
	-- eten en keuken
	Furniture.DiningSet(m, at(base, -8, F0, 5), 3, rgb(40, 40, 44))
	Furniture.Kitchen(m, at(base, 5, F0, 16.1), 10, rgb(40, 40, 44))
	Furniture.Fridge(m, at(base, 12, F0, 15.8))
	Furniture.Island(m, at(base, 4, F0, 9), 8)
	for _, p in { Vector3.new(-24, 0, 2), Vector3.new(-8, 0, 5), Vector3.new(-4, 0, -10), Vector3.new(4, 0, 0) } do
		Furniture.CeilingLight(m, at(base, p.X, FH - 0.7, p.Z))
	end
	-- garage met supercar
	Build.Box(m, at(base, 23, 0.21, 0), Vector3.new(17.5, 0.4, 34), rgb(70, 70, 75), M.Concrete)
	local car = VehicleBuilder.Build(Config.GetVehicle("Supercar"), t.Car, at(base, 23, F0, -2), true)
	car.Parent = m
	Furniture.CeilingLight(m, at(base, 23, FH - 0.7, 0), 30)

	-- slaapkamer
	Furniture.Bed(m, at(base, -19, F1, 11.5), rgb(200, 170, 110), true)
	Furniture.Wardrobe(m, at(base, -7.4, F1, -11) * rot(PI / 2), 9)
	Furniture.Rug(m, at(base, -19, F1, 1), 14, 8, rgb(235, 230, 220))
	Furniture.FloorLamp(m, at(base, -30, F1, -15))
	Furniture.Plant(m, at(base, -30, F1, 15), true)
	-- badkamer
	Furniture.Bathtub(m, at(base, 1, F1, 14.2) * rot(PI / 2))
	Furniture.Sink(m, at(base, -2, F1, 7.1) * rot(PI))
	Furniture.Sink(m, at(base, 2, F1, 7.1) * rot(PI))
	Furniture.Toilet(m, at(base, 6.9, F1, 10) * rot(PI / 2))
	-- speelruimte
	Furniture.PoolTable(m, at(base, 0, F1, -9))
	Furniture.Bookshelf(m, at(base, -4.6, F1, -14) * rot(-PI / 2), 5)
	-- bioscoop
	local screen = Build.Box(m, at(base, 31.3, F1 + 6, 0), Vector3.new(0.2, 7, 14), rgb(30, 60, 140), M.Neon)
	Build.Box(m, at(base, 31.45, F1 + 6, 0), Vector3.new(0.2, 7.6, 14.6), C.Black)
	screen.Name = "Bioscoopscherm"
	Furniture.Sofa(m, at(base, 24, F1, 0) * rot(-PI / 2), 12, rgb(150, 30, 40))
	Furniture.Sofa(m, at(base, 18, F1, 0) * rot(-PI / 2), 12, rgb(150, 30, 40))
	for _, p in { Vector3.new(-19, 0, 2), Vector3.new(0, 0, -9), Vector3.new(1, 0, 12), Vector3.new(11, 0, 10) } do
		Furniture.CeilingLight(m, at(base, p.X, FH * 2 - 0.7, p.Z))
	end
	local dim = Furniture.CeilingLight(m, at(base, 23, FH * 2 - 0.7, 0), 18)
	dim.Color = rgb(120, 140, 255)

	-- zwembad (echt water om in te zwemmen)
	local poolCf = at(plot, poolX, 0, poolZ)
	local terrain = Workspace:FindFirstChildOfClass("Terrain")
	if terrain then
		terrain:FillBlock(at(poolCf, 0, -2.6, 0), Vector3.new(poolW, 5.2, poolD), M.Air)
		terrain:FillBlock(at(poolCf, 0, -2.6, 0), Vector3.new(poolW, 4, poolD), M.Water)
	end
	local tile = rgb(90, 175, 220)
	Build.Box(m, at(poolCf, 0, -4.8, 0), Vector3.new(poolW, 0.4, poolD), tile, M.Granite)
	for _, s in { -1, 1 } do
		Build.Box(m, at(poolCf, 0, -2.3, s * (poolD / 2 + 0.5)), Vector3.new(poolW + 2, 4.6, 1), tile, M.Granite)
		Build.Box(m, at(poolCf, s * (poolW / 2 + 0.5), -2.3, 0), Vector3.new(1, 4.6, poolD), tile, M.Granite)
		Build.Box(m, at(poolCf, 0, 0.15, s * (poolD / 2 + 0.75)), Vector3.new(poolW + 3, 0.3, 1.5), WHITE, M.Marble)
		Build.Box(m, at(poolCf, s * (poolW / 2 + 0.75), 0.15, 0), Vector3.new(1.5, 0.3, poolD), WHITE, M.Marble)
	end
	local glow = Build.Box(m, at(poolCf, 0, -4.5, 0), Vector3.new(poolW - 4, 0.1, 0.6), rgb(150, 220, 255), M.Neon)
	Build.Light(glow, rgb(120, 200, 255), 30, 1.5)
	Build.Box(m, at(plot, poolX, 0.1, 12.2), Vector3.new(44, 0.2, 4.4), rgb(150, 110, 75), M.WoodPlanks)
	for i = 0, 2 do
		Furniture.Sunbed(m, at(plot, 8, 0, 18 + i * 5.5) * rot(PI / 2))
	end
	Furniture.Parasol(m, at(plot, 8, 0, 34), rgb(240, 240, 240))
	Furniture.Palm(m, pos(plot, -44, 0, 18))
	Furniture.Palm(m, pos(plot, 4, 0, 36))
	Furniture.Palm(m, pos(plot, -44, 0, 34))

	-- basketbalveld en tuin
	Furniture.Court(m, at(plot, 52, 0, 4), 34, 50, rgb(60, 110, 170))
	Furniture.Bench(m, at(plot, 32, 0, 4) * rot(-PI / 2))
	Furniture.Hedge(m, at(plot, 0, 0, 37.5), 154, 3)
	Furniture.Hedge(m, at(plot, 77, 0, 0) * rot(PI / 2), 74, 3)
	Furniture.Hedge(m, at(plot, -77, 0, 0) * rot(PI / 2), 74, 3)

	-- voortuin met muur en poort
	Build.Box(m, at(plot, 11, 0.05, -32.5), Vector3.new(14, 0.1, 13), rgb(170, 170, 170), M.Concrete)
	Build.Box(m, at(plot, -16, 0.05, -32.5), Vector3.new(4, 0.1, 13), rgb(200, 195, 185), M.Pavement)
	for _, seg in { { -78, -19 }, { -13, 4 }, { 18, 78 } } do
		local a, b = seg[1], seg[2]
		Build.Box(m, at(plot, (a + b) / 2, 1.3, -37.5), Vector3.new(b - a, 2.6, 1), WHITE, M.Concrete)
		Build.Box(m, at(plot, (a + b) / 2, 2.7, -37.5), Vector3.new(b - a, 0.2, 1.3), C.Black)
	end
	for _, x in { -19, -13, 4, 18 } do
		Build.Box(m, at(plot, x, 1.8, -37.5), Vector3.new(1.6, 3.6, 1.6), C.Black, M.Slate)
		local lamp = Build.Ball(m, at(plot, x, 4, -37.5), 1, rgb(255, 240, 210), M.Neon)
		Build.Light(lamp, rgb(255, 225, 180), 14, 0.8)
	end
	local sign = mailbox(m, at(plot, -22, 0, -35))
	Furniture.Flowerbed(m, at(plot, -30, 0, -30), 14, 3)
	Furniture.Palm(m, pos(plot, -48, 0, -30))

	register(world, {
		Name = name,
		Premium = true,
		Doors = { front, back, garage, balcony, garageInner },
		Panel = panel,
		LockLight = lockLight,
		Sign = sign,
		Entrance = at(base, -4, 0, -hd - 5) * rot(PI),
	})
end

return Homes
