--[[
	Buildings: alle openbare gebouwen.
	Elke functie krijgt het midden van een blok (bx, bz) en zet daar een gebouw neer.
	Lokale voorkant van een gebouw = -Z.
]]

local Workspace = game:GetService("Workspace")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = require(Shared.Config)
local Build = require(script.Parent.Build)
local Furniture = require(script.Parent.Furniture)
local Doors = require(script.Parent.Doors)
local VehicleBuilder = require(script.Parent.VehicleBuilder)

local Buildings = {}

local at = Furniture.At
local C = Furniture.Colors
local M = Enum.Material
local PI = math.pi
local G = 0.6
local F0 = 0.4

local function rgb(r: number, g: number, b: number): Color3
	return Color3.fromRGB(r, g, b)
end

local function rot(a: number): CFrame
	return CFrame.Angles(0, a, 0)
end

local function pos(cf: CFrame, x: number, y: number, z: number): Vector3
	return (cf * CFrame.new(x, y, z)).Position
end

local WHITE = rgb(246, 246, 244)
local ASPHALT = rgb(52, 52, 58)

local function newModel(name: string, parent: Instance): Model
	local m = Instance.new("Model")
	m.Name = name
	m.Parent = parent
	return m
end

local function sign(m: Instance, cf: CFrame, size: Vector3, text: string, bg: Color3, fg: Color3): Part
	local part = Build.Box(m, cf, size, bg)
	Build.Sign(part, text, fg)
	return part
end

local function menuPrompt(world: any, part: BasePart, text: string, object: string, menu: string)
	local prompt = Build.Prompt(part, text, object, 10)
	table.insert(world.MenuPrompts, { Prompt = prompt, Menu = menu })
end

local function rolePrompt(world: any, part: BasePart, text: string, object: string, role: string)
	local prompt = Build.Prompt(part, text, object, 10)
	prompt.KeyboardKeyCode = Enum.KeyCode.F
	prompt.GamepadKeyCode = Enum.KeyCode.ButtonY
	table.insert(world.RolePrompts, { Prompt = prompt, Role = role })
end

local function addCounter(world: any, shop: string, position: Vector3)
	world.ShopCounters[shop] = world.ShopCounters[shop] or {}
	table.insert(world.ShopCounters[shop], position)
end

-- Garageplek waar je een voertuig kiest
local function pad(m: Instance, cf: CFrame, world: any, register: boolean?)
	local p = Build.Box(m, at(cf, 0, 0.03, 0), Vector3.new(10, 0.06, 16), rgb(250, 250, 250), M.Neon)
	p.Transparency = 0.55
	menuPrompt(world, p, "Voertuig kiezen", "Garage", "Vehicles")
	if register then
		table.insert(world.VehiclePads, cf)
	end
end

-- Parkeerplaats met witte vakken
local function lot(m: Instance, cf: CFrame, w: number, d: number, spots: boolean?)
	Build.Box(m, at(cf, 0, 0.05, 0), Vector3.new(w, 0.1, d), ASPHALT, M.Asphalt)
	if spots then
		for x = -w / 2 + 6, w / 2 - 6, 12 do
			Build.Box(m, at(cf, x, 0.11, -d / 2 + 5), Vector3.new(0.4, 0.04, 9), WHITE)
		end
	end
end

type ShellOptions = {
	Color: Color3,
	Material: Enum.Material?,
	Front: { any },
	Back: { any }?,
	Left: { any }?,
	Right: { any }?,
	Floor: Color3?,
	FloorMaterial: Enum.Material?,
	Roof: Color3?,
	LightSpacing: number?,
}

local function shell(m: Instance, base: CFrame, w: number, d: number, h: number, o: ShellOptions)
	local mat = o.Material or M.SmoothPlastic
	Build.Box(m, at(base, 0, 0.2, 0), Vector3.new(w, 0.4, d), o.Floor or rgb(225, 225, 222), o.FloorMaterial or M.Marble)
	Build.Wall(m, at(base, 0, 0, -d / 2 + 0.5), w, h, o.Front, o.Color, mat)
	Build.Wall(m, at(base, 0, 0, d / 2 - 0.5) * rot(PI), w, h, o.Back or {}, o.Color, mat)
	Build.Wall(m, at(base, -w / 2 + 0.5, 0, 0) * rot(PI / 2), d - 2, h, o.Left or {}, o.Color, mat)
	Build.Wall(m, at(base, w / 2 - 0.5, 0, 0) * rot(-PI / 2), d - 2, h, o.Right or {}, o.Color, mat)
	local roof = o.Roof or rgb(60, 62, 68)
	Build.Box(m, at(base, 0, h + 0.4, 0), Vector3.new(w + 2, 0.8, d + 2), roof)
	for _, s in { -1, 1 } do
		Build.Box(m, at(base, 0, h + 1.3, s * (d / 2 + 0.75)), Vector3.new(w + 2, 1, 0.5), roof)
		Build.Box(m, at(base, s * (w / 2 + 0.75), h + 1.3, 0), Vector3.new(0.5, 1, d + 2), roof)
	end
	local spacing = o.LightSpacing or 18
	local nx = math.max(1, math.floor(w / spacing))
	local nz = math.max(1, math.floor(d / spacing))
	for i = 1, nx do
		for j = 1, nz do
			local x = -w / 2 + (i - 0.5) * w / nx
			local z = -d / 2 + (j - 0.5) * d / nz
			Furniture.CeilingLight(m, at(base, x, h - 0.7, z), 30)
		end
	end
end

------------------------------------------------------------------------
-- Politiebureau
------------------------------------------------------------------------

function Buildings.Police(parent: Instance, bx: number, bz: number, world: any)
	local m = newModel("Politiebureau", parent)
	local base = CFrame.new(bx, G, bz + 14) * rot(PI)
	local W, D, H = 64, 44, 18
	local blue = rgb(28, 70, 175)

	local front = Build.Windows(W, 6, 6, 3, 14, { 0 })
	table.insert(front, { x = 0, w = 10, bottom = 0, top = 10, glass = false })
	shell(m, base, W, D, H, {
		Color = rgb(232, 236, 242),
		Front = front,
		Left = Build.Windows(D - 2, 3, 6, 3, 14),
		Right = Build.Windows(D - 2, 3, 6, 3, 14),
		Floor = rgb(185, 190, 200),
		FloorMaterial = M.Slate,
	})
	Build.Box(m, at(base, 0, 12.5, -D / 2 - 0.1), Vector3.new(W, 1.4, 0.3), blue)
	sign(m, at(base, 0, 15.6, -D / 2 - 0.4), Vector3.new(24, 3, 0.4), "POLITIE", blue, WHITE)
	Doors.Create(m, at(base, 0, F0, -D / 2 + 0.5), 10, 9.6, { Style = "Double", Glass = true })
	Build.Box(m, at(base, 0, 10.6, -D / 2 - 3), Vector3.new(16, 0.5, 6), blue)

	-- balie en bureaus
	local desk = Furniture.Counter(m, at(base, 0, F0, -10), 16, blue)
	rolePrompt(world, desk, "Word politie", "Politiebureau", "Politie")
	for _, x in { -22, 22 } do
		Furniture.Desk(m, at(base, x, F0, -12))
		Furniture.Desk(m, at(base, x, F0, -2))
	end
	Furniture.Plant(m, at(base, -29, F0, -18), true)
	Furniture.Plant(m, at(base, 29, F0, -18), true)

	-- cellen achterin
	local cellH = 10
	for _, x in { -18, -6, 6, 18 } do
		Build.Box(m, at(base, x, F0 + cellH / 2, 15.5), Vector3.new(1, cellH, 11), rgb(175, 175, 185), M.Concrete)
	end
	for i, cx in { -12, 0, 12 } do
		for off = -5, 5, 1.4 do
			Build.Box(m, at(base, cx + off, F0 + cellH / 2, 10), Vector3.new(0.3, cellH, 0.3), rgb(70, 70, 75), M.Metal)
		end
		Build.Box(m, at(base, cx, F0 + cellH, 10), Vector3.new(11, 0.4, 0.4), rgb(70, 70, 75), M.Metal)
		Furniture.Seat(m, at(base, cx, F0 + 1.2, 19), Vector3.new(9, 0.6, 2.4), rgb(120, 120, 130), M.Concrete)
		Furniture.Toilet(m, at(base, cx + 4, F0, 19.5) * rot(PI))
		world.JailCells[i] = at(base, cx, F0, 15)
	end
	world.JailExit = at(base, 0, 0, -D / 2 - 9) * rot(PI)

	-- parkeerplaats
	lot(m, at(base, 0, 0, -42), 84, 36, true)
	pad(m, at(base, -26, 0.1, -44), world)
	pad(m, at(base, 26, 0.1, -44), world)
	for _, x in { -12, 12 } do
		Furniture.StreetLamp(m, pos(base, x, 0, -58), (base.LookVector * -1))
	end
	-- vlaggenmast
	local pole = at(base, -46, 0, -30)
	Build.Cylinder(m, at(pole, 0, 11, 0), 22, 0.5, C.Metal, M.Metal)
	for i, color in { rgb(174, 28, 40), WHITE, rgb(33, 70, 139) } do
		Build.Box(m, at(pole, 3, 21.5 - i * 1.1, 0), Vector3.new(5.5, 1.1, 0.15), color, M.Fabric)
	end
end

------------------------------------------------------------------------
-- Brandweer
------------------------------------------------------------------------

function Buildings.FireStation(parent: Instance, bx: number, bz: number, world: any)
	local m = newModel("Brandweer", parent)
	local base = CFrame.new(bx, G, bz + 12) * rot(PI)
	local W, D, H = 60, 44, 16
	local red = rgb(170, 48, 40)

	shell(m, base, W, D, H, {
		Color = red,
		Material = M.Brick,
		Front = {
			{ x = -16, w = 16, bottom = 0, top = 13, glass = false },
			{ x = 6, w = 16, bottom = 0, top = 13, glass = false },
			{ x = 22, w = 5, bottom = 0, top = 9, glass = false },
			{ x = -27, w = 4, bottom = 4, top = 12, glass = true },
		},
		Left = Build.Windows(D - 2, 3, 5, 4, 12),
		Right = Build.Windows(D - 2, 3, 5, 4, 12),
		Floor = rgb(150, 150, 150),
		FloorMaterial = M.Concrete,
	})
	sign(m, at(base, 0, 14.6, -D / 2 - 0.4), Vector3.new(28, 2.4, 0.4), "BRANDWEER", WHITE, red)
	Doors.Create(m, at(base, -16, F0, -D / 2 + 0.5), 16, 12.6, { Style = "Up", Color = rgb(220, 60, 50), Material = M.Metal, Name = "Garage" })
	Doors.Create(m, at(base, 6, F0, -D / 2 + 0.5), 16, 12.6, { Style = "Up", Color = rgb(220, 60, 50), Material = M.Metal, Name = "Garage" })
	Doors.Create(m, at(base, 22, F0, -D / 2 + 0.5), 5, 8.6, { Style = "Swing", Color = WHITE, Material = M.SmoothPlastic })

	-- brandweerauto's binnen
	for _, x in { -16, 6 } do
		local truck = VehicleBuilder.Build(Config.GetVehicle("Brandweerwagen"), C.White, at(base, x, F0, -2), true)
		truck.Parent = m
	end
	-- kluisjes en glijpaal
	for i = 0, 5 do
		Build.Box(m, at(base, 28.2, F0 + 3.5, -10 + i * 2.6), Vector3.new(2.4, 7, 2.4), rgb(200, 50, 45), M.Metal)
	end
	local locker = Build.Box(m, at(base, 26.5, F0 + 4, 3), Vector3.new(0.2, 2, 2), C.Black)
	rolePrompt(world, locker, "Word brandweer", "Brandweer", "Brandweer")
	Build.Cylinder(m, at(base, 20, H / 2, 14), H, 0.5, rgb(220, 220, 225), M.Metal)
	Build.Cylinder(m, at(base, 20, F0 + 0.2, 14), 0.4, 4, rgb(60, 60, 65))

	-- oefentoren
	local tower = at(base, -40, 0, 8)
	Build.Box(m, at(tower, 0, 18, 0), Vector3.new(10, 36, 10), red, M.Brick)
	for y = 8, 32, 8 do
		Build.Window(m, at(tower, 0, y, -5.1), 4, 4, 0.2)
	end
	sign(m, at(tower, 0, 34, -5.3), Vector3.new(8, 2.5, 0.3), "112", WHITE, red)

	lot(m, at(base, 0, 0, -40), 64, 36)
	pad(m, at(base, -16, 0.1, -42), world)
	pad(m, at(base, 6, 0.1, -42), world)
end

------------------------------------------------------------------------
-- Ziekenhuis
------------------------------------------------------------------------

function Buildings.Hospital(parent: Instance, bx: number, bz: number, world: any)
	local m = newModel("Ziekenhuis", parent)
	local base = CFrame.new(bx, G, bz + 10) * rot(PI)
	local W, D, H = 72, 44, 13
	local red = rgb(210, 40, 45)

	local front = Build.Windows(W, 8, 6, 2, 11, { 0 })
	table.insert(front, { x = 0, w = 12, bottom = 0, top = 10, glass = false })
	shell(m, base, W, D, H, {
		Color = WHITE,
		Front = front,
		Back = Build.Windows(W, 8, 6, 2, 11),
		Left = Build.Windows(D - 2, 3, 6, 2, 11),
		Right = Build.Windows(D - 2, 3, 6, 2, 11),
		Floor = rgb(220, 228, 232),
		Roof = rgb(200, 205, 210),
	})
	-- tweede en derde verdieping (alleen buitenkant)
	for level = 1, 2 do
		local b = at(base, 0, level * H + 0.8, 0)
		Build.Wall(m, at(b, 0, 0, -D / 2 + 0.5), W, H, Build.Windows(W, 8, 6, 2, 11), WHITE)
		Build.Wall(m, at(b, 0, 0, D / 2 - 0.5) * rot(PI), W, H, Build.Windows(W, 8, 6, 2, 11), WHITE)
		Build.Wall(m, at(b, -W / 2 + 0.5, 0, 0) * rot(PI / 2), D - 2, H, Build.Windows(D - 2, 3, 6, 2, 11), WHITE)
		Build.Wall(m, at(b, W / 2 - 0.5, 0, 0) * rot(-PI / 2), D - 2, H, Build.Windows(D - 2, 3, 6, 2, 11), WHITE)
		Build.Box(m, at(b, 0, -0.4, 0), Vector3.new(W - 2, 0.8, D - 2), rgb(200, 205, 210))
	end
	local roofTop = 3 * H + 1.6
	Build.Box(m, at(base, 0, roofTop - 0.4, 0), Vector3.new(W + 2, 0.8, D + 2), rgb(200, 205, 210))
	-- helikopterplatform
	Build.Cylinder(m, at(base, 0, roofTop + 0.05, 0), 0.1, 26, rgb(60, 60, 65))
	for _, x in { -3, 3 } do
		Build.Box(m, at(base, x, roofTop + 0.12, 0), Vector3.new(1.2, 0.05, 9), WHITE)
	end
	Build.Box(m, at(base, 0, roofTop + 0.12, 0), Vector3.new(6, 0.05, 1.2), WHITE)

	sign(m, at(base, 0, 2 * H + 6, -D / 2 - 0.4), Vector3.new(30, 3.4, 0.4), "ZIEKENHUIS", WHITE, red)
	Build.Box(m, at(base, -26, 2 * H + 6, -D / 2 - 0.45), Vector3.new(6, 1.8, 0.4), red, M.Neon)
	Build.Box(m, at(base, -26, 2 * H + 6, -D / 2 - 0.45), Vector3.new(1.8, 6, 0.4), red, M.Neon)

	-- ingang met overkapping
	Doors.Create(m, at(base, 0, F0, -D / 2 + 0.5), 12, 9.6, { Style = "Double", Glass = true })
	Build.Box(m, at(base, 0, 11.2, -D / 2 - 6), Vector3.new(26, 0.6, 12), WHITE)
	for _, x in { -12, 12 } do
		Build.Cylinder(m, at(base, x, 5.5, -D / 2 - 11), 11, 0.8, C.Metal, M.Metal)
	end

	-- binnen
	local reception = Furniture.Counter(m, at(base, -4, F0, -8), 14, rgb(90, 160, 200))
	rolePrompt(world, reception, "Word dokter", "Ziekenhuis", "Dokter")
	for row = 0, 2 do
		for i = 0, 4 do
			Furniture.Chair(m, at(base, -32 + i * 2.6, F0, -14 + row * 6) * rot(PI), rgb(80, 150, 200))
		end
	end
	Build.Wall(m, at(base, 12, F0, 0) * rot(PI / 2), D - 2, H - 0.4, { { x = 12, w = 5, bottom = 0, top = 9 } }, rgb(225, 240, 245), nil, 0.5)
	for _, x in { 18, 28 } do
		for _, z in { -14, -3, 8 } do
			Furniture.HospitalBed(m, at(base, x, F0, z))
		end
	end
	Furniture.Plant(m, at(base, -34, F0, 19), true)
	Furniture.Plant(m, at(base, 8, F0, -19), true)

	lot(m, at(base, 0, 0, -42), 76, 32)
	pad(m, at(base, -26, 0.1, -44), world)
	pad(m, at(base, 26, 0.1, -44), world)
end

------------------------------------------------------------------------
-- School
------------------------------------------------------------------------

function Buildings.School(parent: Instance, bx: number, bz: number, world: any)
	local m = newModel("School", parent)
	local base = CFrame.new(bx, G, bz + 6) * rot(PI)
	local W, D, H = 84, 42, 14
	local brick = rgb(214, 150, 92)

	local front = Build.Windows(W, 8, 6, 3, 11, { 0 })
	table.insert(front, { x = 0, w = 10, bottom = 0, top = 10, glass = false })
	shell(m, base, W, D, H, {
		Color = brick,
		Material = M.Brick,
		Front = front,
		Back = Build.Windows(W, 8, 6, 3, 11),
		Left = Build.Windows(D - 2, 3, 6, 3, 11),
		Right = Build.Windows(D - 2, 3, 6, 3, 11),
		Floor = rgb(200, 190, 170),
		FloorMaterial = M.WoodPlanks,
	})
	Build.Box(m, at(base, 0, 12, -D / 2 - 0.1), Vector3.new(W, 1, 0.3), WHITE)
	sign(m, at(base, 0, 16.5, -D / 2 + 0.5), Vector3.new(22, 3.4, 0.5), "SCHOOL", rgb(40, 80, 170), WHITE)
	Doors.Create(m, at(base, 0, F0, -D / 2 + 0.5), 10, 9.6, { Style = "Double", Glass = true })

	-- klaslokalen links en rechts
	for _, side in { -1, 1 } do
		local wallX = side * 14
		Build.Wall(m, at(base, wallX, F0, 0) * rot(PI / 2), D - 2, H - 0.4, { { x = 13, w = 5, bottom = 0, top = 9 } }, rgb(245, 240, 225), nil, 0.5)
		local cx = side * 28
		Furniture.Whiteboard(m, at(base, cx, F0, 20.2), side == -1 and "Rekenen\n2 + 2 = 4" or "Taal\nHallo!")
		for _, dx in { -7, 0, 7 } do
			for _, z in { -8, -1, 6 } do
				Furniture.SchoolDesk(m, at(base, cx + dx, F0, z))
			end
		end
		local teacher = at(base, cx, F0, 14) * rot(PI)
		Furniture.Desk(m, teacher)
		if side == -1 then
			local top = Build.Box(m, at(teacher, 0, 3.3, 0), Vector3.new(1, 0.3, 1), rgb(220, 60, 60))
			rolePrompt(world, top, "Word leraar", "School", "Leraar")
		end
	end
	-- gang met kluisjes
	for i = -4, 4 do
		Build.Box(m, at(base, -12.6, F0 + 3.5, i * 3.6), Vector3.new(2, 7, 3.4), rgb(60, 110, 190), M.Metal)
		Build.Box(m, at(base, 12.6, F0 + 3.5, i * 3.6), Vector3.new(2, 7, 3.4), rgb(60, 110, 190), M.Metal)
	end
	local board = Build.Box(m, at(base, 0, 7, 20.2), Vector3.new(10, 4, 0.3), rgb(40, 80, 170))
	Build.Sign(board, "Welkom leerlingen! 🎒", WHITE)
	rolePrompt(world, board, "Word leerling", "School", "Leerling")
	Furniture.Bench(m, at(base, 0, F0, 8))

	-- speelplein en bus
	Furniture.Court(m, CFrame.new(bx, G, bz - 48) * rot(PI / 2), 34, 50, rgb(190, 80, 60))
	lot(m, at(base, 0, 0, -40), 84, 30)
	pad(m, at(base, 28, 0.1, -40), world)
	for _, x in { -40, 40 } do
		Furniture.Tree(m, pos(base, x, 0, -48))
	end
end

------------------------------------------------------------------------
-- Bank (met kluis die boeven kunnen overvallen)
------------------------------------------------------------------------

function Buildings.Bank(parent: Instance, bx: number, bz: number, world: any)
	local m = newModel("Bank", parent)
	local base = CFrame.new(bx + 10, G, bz) * rot(-PI / 2)
	local W, D, H = 50, 40, 18
	local stone = rgb(228, 222, 206)
	local gold = rgb(230, 185, 60)

	shell(m, base, W, D, H, {
		Color = stone,
		Material = M.Marble,
		Front = {
			{ x = 0, w = 8, bottom = 0, top = 11, glass = false },
			{ x = -17, w = 6, bottom = 3, top = 13, glass = true },
			{ x = 17, w = 6, bottom = 3, top = 13, glass = true },
		},
		Left = Build.Windows(D - 2, 3, 5, 4, 13),
		Right = Build.Windows(D - 2, 3, 5, 4, 13),
		Floor = rgb(240, 235, 225),
	})
	Doors.Create(m, at(base, 0, F0, -D / 2 + 0.5), 8, 10.6, { Style = "Double", Glass = true })

	-- zuilen, trappen en fronton
	for i = 0, 5 do
		Build.Cylinder(m, at(base, -20 + i * 8, F0 + 8, -D / 2 - 5), 16, 2, stone, M.Marble)
	end
	Build.Box(m, at(base, 0, F0 + 16.6, -D / 2 - 3), Vector3.new(W + 2, 1.2, 8), stone, M.Marble)
	Build.Box(m, at(base, 0, F0 + 18.5, -D / 2 - 3), Vector3.new(W - 6, 2.6, 6), stone, M.Marble)
	sign(m, at(base, 0, F0 + 18.5, -D / 2 - 6.1), Vector3.new(16, 2.4, 0.3), "BANK", stone, gold)
	Build.Box(m, at(base, 0, 0.2, -D / 2 - 5), Vector3.new(W + 2, 0.4, 10), stone, M.Marble)
	-- geldautomaten
	for _, x in { -10, 10 } do
		local atm = Build.Box(m, at(base, x, F0 + 2.5, -D / 2 - 0.7), Vector3.new(3, 5, 0.6), rgb(50, 55, 65), M.Metal)
		Build.Box(m, at(atm.CFrame, 0, 0.8, -0.32), Vector3.new(2, 1.4, 0.05), rgb(40, 140, 220), M.Neon)
	end

	-- loketten met glas
	Furniture.Counter(m, at(base, -4, F0, 0), 28, rgb(120, 80, 50))
	Build.Glass(m, at(base, -4, F0 + 5.6, 0), Vector3.new(28, 4, 0.2))
	Furniture.Seat(m, at(base, -12, F0 + 1.6, -8), Vector3.new(8, 0.5, 2), rgb(60, 70, 100), M.Leather)
	Furniture.Seat(m, at(base, 4, F0 + 1.6, -8), Vector3.new(8, 0.5, 2), rgb(60, 70, 100), M.Leather)
	Furniture.Plant(m, at(base, -22, F0, -17), true)
	Furniture.Plant(m, at(base, 22, F0, -17), true)
	Doors.Create(m, at(base, 15, F0, 0), 5, 8.6, { Style = "Swing", Color = rgb(120, 80, 50), Name = "Personeel" })
	Build.Box(m, at(base, 21, F0 + 4.3, 0), Vector3.new(7, 8.6, 1), stone, M.Marble)
	Build.Box(m, at(base, 11.25, F0 + 4.3, 0), Vector3.new(2.5, 8.6, 1), stone, M.Marble)
	Build.Box(m, at(base, -21, F0 + 4.3, 0), Vector3.new(6, 8.6, 1), stone, M.Marble)

	-- kluis
	local steel = rgb(110, 115, 125)
	Build.Wall(m, at(base, -8, F0, 8.5), 24, 11, { { x = 0, w = 6, bottom = 0, top = 9 } }, steel, M.DiamondPlate, 1.2)
	Build.Wall(m, at(base, -20, F0, 14.2) * rot(PI / 2), 10.2, 11, {}, steel, M.DiamondPlate, 1.2)
	Build.Wall(m, at(base, 4, F0, 14.2) * rot(PI / 2), 10.2, 11, {}, steel, M.DiamondPlate, 1.2)
	Build.Box(m, at(base, -8, F0 + 11.3, 14.2), Vector3.new(25.2, 0.6, 11.6), steel, M.DiamondPlate)
	local vaultDoor = Doors.Create(m, at(base, -8, F0, 8.5), 6, 8.9, { Style = "Swing", Color = rgb(160, 165, 175), Material = M.DiamondPlate, Name = "Kluis" })
	Doors.SetLocked(vaultDoor, true)
	if vaultDoor.Prompt then
		vaultDoor.Prompt.Enabled = false
	end
	local keypad = Build.Box(m, at(base, -3.6, F0 + 4.5, 7.75), Vector3.new(1.2, 1.6, 0.3), C.Black, M.Metal)
	Build.Box(m, at(base, -3.6, F0 + 4.8, 7.58), Vector3.new(0.8, 0.5, 0.05), rgb(220, 40, 40), M.Neon)
	for i = 0, 3 do
		for j = 0, 2 do
			Build.Box(m, at(base, -16 + i * 0.9, F0 + 0.3 + j * 0.45, 17), Vector3.new(0.8, 0.4, 2), gold, M.Metal)
		end
	end
	local cash = Build.Box(m, at(base, -1, F0 + 1, 16.5), Vector3.new(4, 2, 3), rgb(70, 160, 80), M.Fabric)
	cash.Name = "Geld"
	Build.Box(m, at(base, -1, F0 + 2.3, 16.5), Vector3.new(3, 0.6, 2), rgb(90, 180, 100), M.Fabric)

	local alarms = {}
	for _, p in { Vector3.new(-20, 0, -15), Vector3.new(20, 0, -15), Vector3.new(-20, 0, 15), Vector3.new(20, 0, 2) } do
		local lamp = Build.Box(m, at(base, p.X, H - 1, p.Z), Vector3.new(1.4, 0.8, 1.4), rgb(120, 20, 20), M.SmoothPlastic)
		local light = Build.Light(lamp, rgb(255, 30, 30), 30, 3)
		light.Enabled = false
		table.insert(alarms, lamp)
	end

	world.Bank = {
		VaultDoor = vaultDoor,
		Keypad = keypad,
		Cash = cash,
		Alarms = alarms,
		Center = pos(base, 0, 4, 0),
	}

	lot(m, at(base, 0, 0, -40), 56, 16)
end

------------------------------------------------------------------------
-- Plein (hier verschijn je)
------------------------------------------------------------------------

function Buildings.Plaza(parent: Instance, bx: number, bz: number, world: any)
	local m = newModel("Plein", parent)
	local c = CFrame.new(bx, G, bz)

	-- fontein
	Build.Cylinder(m, at(c, 0, 1, 0), 2, 30, rgb(205, 205, 210), M.Marble)
	local water = Build.Cylinder(m, at(c, 0, 1.6, 0), 1.2, 27, rgb(70, 160, 230), M.Glass)
	water.Transparency = 0.25
	Build.Cylinder(m, at(c, 0, 5, 0), 7, 3.6, rgb(205, 205, 210), M.Marble)
	Build.Cylinder(m, at(c, 0, 8.8, 0), 0.8, 12, rgb(205, 205, 210), M.Marble)
	Build.Cylinder(m, at(c, 0, 11, 0), 4, 1.8, rgb(205, 205, 210), M.Marble)
	local top = Build.Ball(m, at(c, 0, 13.4, 0), 2.4, rgb(70, 160, 230), M.Glass)
	local spray = Instance.new("ParticleEmitter")
	spray.Color = ColorSequence.new(rgb(210, 240, 255))
	spray.Size = NumberSequence.new(0.45)
	spray.Transparency = NumberSequence.new(0.3)
	spray.Lifetime = NumberRange.new(1, 1.4)
	spray.Rate = 90
	spray.Speed = NumberRange.new(16, 20)
	spray.SpreadAngle = Vector2.new(20, 20)
	spray.Acceleration = Vector3.new(0, -35, 0)
	spray.EmissionDirection = Enum.NormalId.Top
	spray.Parent = top

	for i = 0, 7 do
		local angle = i * PI / 4 + PI / 8
		local p = Vector3.new(bx + math.sin(angle) * 24, G, bz + math.cos(angle) * 24)
		Furniture.Bench(m, CFrame.lookAt(p, Vector3.new(bx, G, bz)))
	end
	for _, sx in { -1, 1 } do
		for _, sz in { -1, 1 } do
			Furniture.Palm(m, pos(c, sx * 40, 0, sz * 40))
			Furniture.Flowerbed(m, at(c, sx * 56, 0, sz * 30), 14, 4)
			Furniture.Tree(m, pos(c, sx * 62, 0, sz * 62), 1.1)
		end
	end
	-- paden
	Build.Box(m, at(c, 0, 0.04, 0), Vector3.new(156, 0.08, 10), rgb(200, 185, 160), M.Cobblestone)
	Build.Box(m, at(c, 0, 0.05, 0), Vector3.new(10, 0.08, 156), rgb(200, 185, 160), M.Cobblestone)

	-- welkomstbord en bushokje
	local signCf = at(c, 0, 0, -52) * rot(PI)
	for _, s in { -1, 1 } do
		Build.Box(m, at(signCf, s * 15, 5, 0), Vector3.new(1.2, 10, 1.2), rgb(60, 60, 66), M.Metal)
	end
	sign(m, at(signCf, 0, 9, 0), Vector3.new(30, 6, 0.6), "Welkom in " .. Config.TownName .. "! 🌞", rgb(30, 90, 190), WHITE)
	local shelter = at(c, 66, 0, -20) * rot(-PI / 2)
	Build.Box(m, at(shelter, 0, 8, 0), Vector3.new(14, 0.4, 6), rgb(60, 60, 66), M.Metal)
	Build.Glass(m, at(shelter, 0, 4, 2.8), Vector3.new(14, 8, 0.2))
	for _, s in { -1, 1 } do
		Build.Box(m, at(shelter, s * 7, 4, 0), Vector3.new(0.4, 8, 6), rgb(60, 60, 66), M.Metal)
	end
	Furniture.Bench(m, at(shelter, 0, 0, 1.5))
	sign(m, at(shelter, 5, 9.4, 0), Vector3.new(3, 2, 0.3), "BUS", rgb(250, 200, 40), C.Black)

	Build.New("SpawnLocation", {
		Name = "Spawn",
		CFrame = at(c, 0, 0.5, 34),
		Size = Vector3.new(20, 1, 10),
		Transparency = 1,
		CanCollide = false,
		CanQuery = false,
		Neutral = true,
		Duration = 0,
		AllowTeamChangeOnTouch = false,
		Parent = m,
	})
end

------------------------------------------------------------------------
-- Winkels: snackbar, supermarkt en tankstation
------------------------------------------------------------------------

local function snackbar(m: Instance, base: CFrame, world: any)
	local W, D, H = 36, 26, 12
	shell(m, base, W, D, H, {
		Color = rgb(252, 242, 218),
		Front = {
			{ x = -10, w = 6, bottom = 0, top = 9, glass = false },
			{ x = 6, w = 16, bottom = 3, top = 9, glass = true },
		},
		Left = Build.Windows(D - 2, 2, 5, 3, 8),
		Right = Build.Windows(D - 2, 2, 5, 3, 8),
		Roof = rgb(205, 40, 40),
		Floor = rgb(240, 240, 240),
	})
	Doors.Create(m, at(base, -10, F0, -D / 2 + 0.5), 6, 8.6, { Style = "Double", Glass = true })
	for i = 0, 8 do
		Build.Box(m, at(base, -W / 2 + 2 + i * 4, 9.8, -D / 2 - 2.5), Vector3.new(4, 0.4, 5), i % 2 == 0 and rgb(205, 40, 40) or WHITE, M.Fabric)
	end
	sign(m, at(base, 0, 14.6, -D / 2 + 1), Vector3.new(22, 3.5, 0.6), "SNACKBAR", rgb(205, 40, 40), rgb(250, 205, 40))
	-- reuze patatzak op het dak
	local rng = Furniture.Random
	Build.Box(m, at(base, 11, H + 3.5, 5), Vector3.new(4, 5, 3), rgb(205, 40, 40))
	for _ = 1, 7 do
		local len = rng:NextNumber(2, 3.5)
		Build.Box(m, at(base, 11 + rng:NextNumber(-1.4, 1.4), H + 6 + len / 2, 5 + rng:NextNumber(-0.9, 0.9)), Vector3.new(0.5, len, 0.5), rgb(250, 205, 40))
	end

	local top = Furniture.Counter(m, at(base, -4, F0, 3), 22, rgb(205, 40, 40))
	menuPrompt(world, top, "Bestellen", "Snackbar", "Food:Snackbar")
	addCounter(world, "Snackbar", top.CFrame.Position)
	for _, x in { -12, -6 } do
		Build.Box(m, at(base, x, F0 + 1.8, 10), Vector3.new(4, 3.6, 3), C.Metal, M.DiamondPlate)
		Build.Box(m, at(base, x, F0 + 3.65, 10), Vector3.new(3.2, 0.1, 2.2), rgb(230, 170, 40), M.Neon)
	end
	local board = Build.Box(m, at(base, -4, 8, D / 2 - 1.15), Vector3.new(16, 4, 0.2), C.Black)
	Build.Sign(board, "MENU\nFriet • Burger • Frikandel\nCola • IJsje", rgb(250, 205, 40))
	local locker = Build.Box(m, at(base, 15, F0 + 3, 10), Vector3.new(3, 6, 2), C.Metal, M.Metal)
	rolePrompt(world, locker, "Werk hier", "Snackbar", "Snackbar")
	Furniture.Table(m, at(base, 10, F0, -6), 5, 4)
	Furniture.Chair(m, at(base, 10, F0, -9.2) * rot(PI), rgb(205, 40, 40))
	Furniture.Chair(m, at(base, 10, F0, -2.8), rgb(205, 40, 40))
	-- terras
	for i, x in { -12, 0, 12 } do
		local spot = at(base, x, 0, -28)
		Furniture.Table(m, spot, 4, 4)
		Furniture.Chair(m, at(spot, 0, 0, -3.2) * rot(PI), WHITE)
		Furniture.Chair(m, at(spot, 0, 0, 3.2), WHITE)
		Furniture.Parasol(m, spot, i % 2 == 0 and rgb(250, 205, 40) or rgb(205, 40, 40))
	end
end

local function supermarket(m: Instance, base: CFrame, world: any)
	local W, D, H = 56, 40, 14
	local green = rgb(40, 140, 70)
	shell(m, base, W, D, H, {
		Color = rgb(238, 238, 234),
		Front = {
			{ x = -16, w = 10, bottom = 0, top = 10, glass = false },
			{ x = 8, w = 30, bottom = 1, top = 10, glass = true },
			{ x = -24.5, w = 5, bottom = 3, top = 10, glass = true },
		},
		Floor = rgb(230, 230, 230),
	})
	Build.Box(m, at(base, 0, 12, -D / 2 - 0.1), Vector3.new(W, 2, 0.3), green)
	sign(m, at(base, 0, 16, -D / 2 + 1), Vector3.new(26, 3.4, 0.6), "SUPERMARKT", green, WHITE)
	Doors.Create(m, at(base, -16, F0, -D / 2 + 0.5), 10, 9.6, { Style = "Double", Glass = true })
	Build.Box(m, at(base, -16, 10.8, -D / 2 - 3), Vector3.new(14, 0.5, 6), green)

	for _, z in { 0, 7, 14 } do
		Furniture.StoreShelf(m, at(base, -6, F0, z), 30)
	end
	for i = 0, 4 do
		Furniture.Fridge(m, at(base, 25.6, F0, -2 + i * 4) * rot(PI / 2))
	end
	for i, x in { -2, 6, 14 } do
		local top = Furniture.Checkout(m, at(base, x, F0, -10))
		if i == 1 then
			menuPrompt(world, top, "Afrekenen", "Supermarkt", "Food:Supermarkt")
			addCounter(world, "Supermarkt", top.CFrame.Position)
		end
	end
	-- winkelwagentjes
	for i = 0, 3 do
		local cart = at(base, -24, F0, -14 + i * 2.2)
		Build.Box(m, at(cart, 0, 2.2, 0), Vector3.new(2.6, 1.8, 1.8), C.Metal, M.DiamondPlate)
		Build.Box(m, at(cart, 0, 0.6, 0), Vector3.new(2.4, 0.2, 1.6), C.Black)
	end
	lot(m, at(base, 0, 0, -38), W, 34, true)
end

local function gasStation(m: Instance, base: CFrame, world: any)
	local orange = rgb(240, 120, 30)
	lot(m, at(base, 0, 0, -10), 60, 52)
	-- overkapping met pompen
	Build.Box(m, at(base, 0, 13, -10), Vector3.new(38, 1.4, 22), WHITE)
	Build.Box(m, at(base, 0, 13, -21.1), Vector3.new(38, 1.4, 0.3), orange, M.Neon)
	for _, x in { -15, 15 } do
		for _, z in { -17, -3 } do
			Build.Box(m, at(base, x, 6.2, z), Vector3.new(1.2, 12.4, 1.2), WHITE)
		end
	end
	for _, x in { -9, 0, 9 } do
		local pump = at(base, x, 0, -10)
		Build.Box(m, at(pump, 0, 0.3, 0), Vector3.new(3, 0.6, 7), rgb(200, 200, 200), M.Concrete)
		Build.Box(m, at(pump, 0, 2.6, 0), Vector3.new(1.8, 4.6, 2.6), WHITE)
		Build.Box(m, at(pump, 0, 4, -1.32), Vector3.new(1.4, 1, 0.05), rgb(40, 200, 120), M.Neon)
		Build.Box(m, at(pump, 0, 4.6, 0), Vector3.new(1.9, 0.6, 2.7), orange)
		Furniture.CeilingLight(m, at(pump, 0, 12.2, 0), 28)
	end
	-- winkeltje
	local shop = at(base, 0, 0, 16)
	shell(m, shop, 24, 16, 11, {
		Color = WHITE,
		Front = {
			{ x = -6, w = 6, bottom = 0, top = 9, glass = false },
			{ x = 5, w = 10, bottom = 2, top = 9, glass = true },
		},
	})
	Build.Box(m, at(shop, 0, 10, -8.1), Vector3.new(24, 1.6, 0.3), orange)
	Doors.Create(m, at(shop, -6, F0, -7.5), 6, 8.6, { Style = "Double", Glass = true })
	local top = Furniture.Counter(m, at(shop, 5, F0, 3), 10, orange)
	menuPrompt(world, top, "Afrekenen", "Tankstation", "Food:Supermarkt")
	addCounter(world, "Supermarkt", top.CFrame.Position)
	Furniture.StoreShelf(m, at(shop, -5, F0, 3), 8)
	-- prijsbord
	local pole = at(base, 24, 0, -32)
	Build.Box(m, at(pole, 0, 8, 0), Vector3.new(1, 16, 1), C.Metal, M.Metal)
	sign(m, at(pole, 0, 15, 0) * rot(PI / 2), Vector3.new(7, 6, 0.6), "⛽ BENZINE\n€ 1,99", orange, WHITE)
end

function Buildings.Shops(parent: Instance, bx: number, bz: number, world: any)
	local m = newModel("Winkels", parent)
	snackbar(newModel("Snackbar", m), CFrame.new(bx - 30, G, bz - 38) * rot(PI / 2), world)
	supermarket(newModel("Supermarkt", m), CFrame.new(bx - 22, G, bz + 34) * rot(PI / 2), world)
	gasStation(newModel("Tankstation", m), CFrame.new(bx + 42, G, bz) * rot(-PI / 2), world)
end

------------------------------------------------------------------------
-- Kantoortoren met lift
------------------------------------------------------------------------

function Buildings.Office(parent: Instance, bx: number, bz: number, world: any)
	local m = newModel("Kantoor", parent)
	local base = CFrame.new(bx, G, bz + 4) * rot(PI)
	local w, d, fh, floors = 44, 44, 12, 6
	local wallColor = rgb(60, 72, 92)

	local function floorY(i: number): number
		return i < floors and i * fh + F0 or floors * fh + 1
	end

	local panels = {}
	for i = 0, floors - 1 do
		local fb = at(base, 0, i * fh, 0)
		local front = Build.Windows(w, 5, 7, 1.5, 10.5, i == 0 and { 0 } or nil)
		if i == 0 then
			table.insert(front, { x = 0, w = 10, bottom = 0, top = 9.5, glass = false })
		end
		Build.Box(m, at(fb, 0, 0.2, 0), Vector3.new(w, 0.4, d), rgb(195, 200, 205), M.Slate)
		Build.Wall(m, at(fb, 0, 0, -d / 2 + 0.5), w, fh, front, wallColor)
		Build.Wall(m, at(fb, 0, 0, d / 2 - 0.5) * rot(PI), w, fh, Build.Windows(w, 5, 7, 1.5, 10.5, { 14 }), wallColor)
		Build.Wall(m, at(fb, -w / 2 + 0.5, 0, 0) * rot(PI / 2), d - 2, fh, Build.Windows(d - 2, 5, 6, 1.5, 10.5), wallColor)
		Build.Wall(m, at(fb, w / 2 - 0.5, 0, 0) * rot(-PI / 2), d - 2, fh, Build.Windows(d - 2, 5, 6, 1.5, 10.5), wallColor)
		Furniture.CeilingLight(m, at(fb, -10, fh - 0.5, 0), 30)
		Furniture.CeilingLight(m, at(fb, 10, fh - 0.5, 0), 30)
		for _, x in { -12, 0, 12 } do
			for _, z in { -6, 6 } do
				Furniture.Desk(m, at(fb, x, F0, z))
			end
		end
		Furniture.Plant(m, at(fb, 18, F0, -18), true)
		Furniture.Plant(m, at(fb, -18, F0, -18), true)
		panels[i] = Build.Box(m, at(fb, -14, 4, d / 2 - 1.15), Vector3.new(3, 5, 0.3), C.Metal, M.Metal)
	end

	-- dak met helikopterplatform
	local roofY = floors * fh
	Build.Box(m, at(base, 0, roofY + 0.5, 0), Vector3.new(w + 1, 1, d + 1), rgb(90, 95, 100), M.Concrete)
	for _, s in { -1, 1 } do
		Build.Box(m, at(base, 0, roofY + 2.5, s * (d / 2)), Vector3.new(w + 1, 3, 0.6), wallColor)
		Build.Box(m, at(base, s * (w / 2), roofY + 2.5, 0), Vector3.new(0.6, 3, d + 1), wallColor)
	end
	Build.Cylinder(m, at(base, 4, roofY + 1.05, -4), 0.1, 24, C.Black)
	for _, x in { 1, 7 } do
		Build.Box(m, at(base, x, roofY + 1.12, -4), Vector3.new(1.2, 0.05, 8), rgb(250, 205, 40))
	end
	Build.Box(m, at(base, 4, roofY + 1.12, -4), Vector3.new(5, 0.05, 1.2), rgb(250, 205, 40))
	Build.Box(m, at(base, -14, roofY + 4, d / 2 - 4), Vector3.new(7, 6, 6), wallColor)
	panels[floors] = Build.Box(m, at(base, -14, roofY + 3.5, d / 2 - 7.15), Vector3.new(3, 4, 0.3), C.Metal, M.Metal)
	sign(m, at(base, 0, roofY - 3, -d / 2 - 0.4), Vector3.new(20, 3, 0.4), "KANTOOR", wallColor, WHITE)
	Doors.Create(m, at(base, 0, F0, -d / 2 + 0.5), 10, 9.1, { Style = "Double", Glass = true })

	-- lift: E = omhoog, R = omlaag
	for level, panel in panels do
		local function target(to: number): CFrame
			local z = to == floors and d / 2 - 10 or d / 2 - 4
			return at(base, -14, floorY(to) + 3, z) * rot(PI)
		end
		local function makePrompt(text: string, key: Enum.KeyCode, padKey: Enum.KeyCode, to: number)
			local prompt = Build.Prompt(panel, text, "Lift (verdieping " .. level .. ")", 8)
			prompt.KeyboardKeyCode = key
			prompt.GamepadKeyCode = padKey
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

	local reception = Furniture.Counter(m, at(base, 10, F0, -14), 10, rgb(230, 230, 230))
	rolePrompt(world, reception, "Werk hier", "Kantoor", "Kantoor")

	Build.Box(m, at(base, 0, 0.05, -d / 2 - 26), Vector3.new(10, 0.1, 52), rgb(200, 195, 185), M.Pavement)
	lot(m, at(base, 0, 0, -d / 2 - 20) * CFrame.new(32, 0, 0), 24, 30)
	for _, x in { -16, 16 } do
		Furniture.Tree(m, pos(base, x, 0, -d / 2 - 14))
	end
end

------------------------------------------------------------------------
-- Autodealer
------------------------------------------------------------------------

function Buildings.CarDealer(parent: Instance, bx: number, bz: number, world: any)
	local m = newModel("Autodealer", parent)
	local base = CFrame.new(bx - 24, G, bz) * rot(-PI / 2)
	local W, D, H = 60, 36, 14
	shell(m, base, W, D, H, {
		Color = rgb(240, 240, 244),
		Front = {
			{ x = -22, w = 8, bottom = 0, top = 10, glass = false },
			{ x = 6, w = 40, bottom = 0.6, top = 12.5, glass = true },
		},
		Left = Build.Windows(D - 2, 2, 8, 2, 11),
		Right = Build.Windows(D - 2, 2, 8, 2, 11),
		Roof = rgb(200, 40, 40),
		Floor = rgb(235, 235, 238),
	})
	sign(m, at(base, 0, H + 3, -D / 2 + 1), Vector3.new(28, 4, 0.6), "AUTODEALER", rgb(200, 40, 40), WHITE)
	Doors.Create(m, at(base, -22, F0, -D / 2 + 0.5), 8, 9.6, { Style = "Double", Glass = true })

	local showcase = {
		{ Id = "Sportwagen", X = -12, Z = 2, Color = rgb(200, 30, 40) },
		{ Id = "Supercar", X = 8, Z = 2, Color = rgb(240, 200, 30) },
		{ Id = "Racemotor", X = 22, Z = 6, Color = rgb(30, 90, 200) },
	}
	for _, car in showcase do
		local spot = at(base, car.X, F0, car.Z) * rot(0.5)
		Build.Cylinder(m, at(spot, 0, 0.2, 0), 0.4, car.Id == "Racemotor" and 10 or 18, rgb(60, 60, 65), M.Metal)
		VehicleBuilder.Build(Config.GetVehicle(car.Id), car.Color, at(spot, 0, 0.4, 0), true).Parent = m
	end
	Furniture.Desk(m, at(base, -20, F0, 10))
	Furniture.Plant(m, at(base, -27, F0, -15), true)

	lot(m, at(base, 0, 0, -50), 140, 60)
	for _, x in { -48, -24, 0, 24, 48 } do
		local cf = at(base, x, 0.1, -52)
		pad(m, cf, world, true)
	end
	local info = sign(m, at(base, 0, 4, -24), Vector3.new(16, 3, 0.4), "🚗 Kies hier je voertuig!", C.Black, WHITE)
	info.CanCollide = false
	Build.Box(m, at(base, 0, 1.25, -24), Vector3.new(0.6, 2.5, 0.6), C.Metal)
end

------------------------------------------------------------------------
-- Park met vijver
------------------------------------------------------------------------

function Buildings.Park(parent: Instance, bx: number, bz: number, world: any)
	local m = newModel("Park", parent)
	local c = CFrame.new(bx, G, bz)
	local pondX, pondZ, pondW, pondD = -20, 10, 56, 36

	Build.FloorWithHole(m, c, 156, 156, { x = pondX, w = pondW + 2, z = pondZ, d = pondD + 2 }, rgb(98, 168, 78), M.Grass)
	local pond = at(c, pondX, 0, pondZ)
	local terrain = Workspace:FindFirstChildOfClass("Terrain")
	if terrain then
		terrain:FillBlock(at(pond, 0, -3, 0), Vector3.new(pondW, 6, pondD), M.Air)
		terrain:FillBlock(at(pond, 0, -2.6, 0), Vector3.new(pondW, 4, pondD), M.Water)
		terrain:FillBlock(at(pond, 0, -5.6, 0), Vector3.new(pondW + 4, 2, pondD + 4), M.Sand)
	end
	for _, s in { -1, 1 } do
		Build.Box(m, at(pond, 0, -2, s * (pondD / 2 + 0.5)), Vector3.new(pondW + 2, 4.4, 1), rgb(120, 120, 125), M.Slate)
		Build.Box(m, at(pond, s * (pondW / 2 + 0.5), -2, 0), Vector3.new(1, 4.4, pondD), rgb(120, 120, 125), M.Slate)
	end
	-- steiger
	Build.Box(m, at(pond, 0, 0.2, pondD / 2 - 7), Vector3.new(5, 0.4, 16), rgb(140, 100, 65), M.WoodPlanks)
	for _, z in { 0, 6, 12 } do
		for _, x in { -2, 2 } do
			Build.Box(m, at(pond, x, -2, pondD / 2 - 1 - z), Vector3.new(0.6, 4.4, 0.6), rgb(110, 80, 50), M.Wood)
		end
	end

	-- paden
	local path = rgb(205, 195, 175)
	Build.Box(m, at(c, 20, 0.05, 0), Vector3.new(6, 0.1, 156), path, M.Pavement)
	Build.Box(m, at(c, 0, 0.06, -40), Vector3.new(156, 0.1, 6), path, M.Pavement)
	Build.Box(m, at(c, -20, 0.05, 40), Vector3.new(80, 0.1, 6), path, M.Pavement)

	-- speeltuin
	local play = at(c, 48, 0, -52)
	Build.Box(m, at(play, 0, 0.1, 0), Vector3.new(36, 0.2, 26), rgb(230, 205, 150), M.Sand)
	-- glijbaan
	local slide = at(play, -8, 0, 0)
	Build.Box(m, at(slide, 0, 3.5, 4), Vector3.new(4, 7, 4), rgb(240, 80, 60))
	Build.Box(m, at(slide, 0, 7.2, 4), Vector3.new(4.4, 0.4, 4.4), rgb(250, 205, 40))
	Build.Box(m, at(slide, 0, 3.8, -2.6) * CFrame.Angles(-0.62, 0, 0), Vector3.new(3, 0.4, 10), rgb(60, 140, 230))
	for i = 0, 6 do
		Build.Box(m, at(slide, 0, 0.5 + i, 6.6 + 0.3), Vector3.new(3, 0.3, 0.8), C.Metal, M.Metal)
	end
	-- schommels
	local swing = at(play, 9, 0, 0)
	for _, s in { -1, 1 } do
		Build.Box(m, at(swing, s * 6, 4.5, 0), Vector3.new(0.5, 9, 0.5), rgb(60, 140, 230), M.Metal)
	end
	Build.Box(m, at(swing, 0, 9, 0), Vector3.new(12.5, 0.5, 0.5), rgb(60, 140, 230), M.Metal)
	for _, x in { -2.5, 2.5 } do
		for _, s in { -0.8, 0.8 } do
			Build.Box(m, at(swing, x + s, 6, 0), Vector3.new(0.1, 6, 0.1), C.Black)
		end
		Furniture.Seat(m, at(swing, x, 2.9, 0), Vector3.new(2, 0.3, 1), rgb(250, 205, 40), M.SmoothPlastic)
	end

	-- sportveld
	Furniture.Court(m, at(c, 50, 0, 30), 34, 50, rgb(70, 130, 80))

	-- picknicktafels, bankjes en bomen
	for i, x in { -44, -24, -4 } do
		local spot = at(c, x, 0, 56)
		Furniture.Table(m, spot, 6, 3)
		Furniture.Seat(m, at(spot, 0, 1.6, -2.6), Vector3.new(6, 0.4, 1.4), C.Wood, M.Wood)
		Furniture.Seat(m, at(spot, 0, 1.6, 2.6), Vector3.new(6, 0.4, 1.4), C.Wood, M.Wood)
		if i == 2 then
			Furniture.Parasol(m, spot, rgb(240, 80, 80))
		end
	end
	for _, z in { -60, -20, 30, 60 } do
		Furniture.Bench(m, at(c, 25, 0, z) * rot(-PI / 2))
	end
	local rng = Furniture.Random
	local placed = 0
	while placed < 26 do
		local x = rng:NextNumber(-74, 74)
		local z = rng:NextNumber(-74, 74)
		local inPond = math.abs(x - pondX) < pondW / 2 + 6 and math.abs(z - pondZ) < pondD / 2 + 6
		local inPlay = x > 26 and z < -36
		local inCourt = x > 28 and z > 0
		local onPath = math.abs(x - 20) < 7 or math.abs(z + 40) < 7 or (math.abs(z - 40) < 7 and x < 22) or (z > 50 and x < 0)
		if not (inPond or inPlay or inCourt or onPath) then
			if rng:NextNumber() < 0.5 then
				Furniture.Tree(m, pos(c, x, 0, z), rng:NextNumber(0.9, 1.3))
			else
				Furniture.Pine(m, pos(c, x, 0, z), rng:NextNumber(0.9, 1.3))
			end
			placed += 1
		end
	end
	-- ijscokar
	local cart = at(c, 0, 0, -30)
	Build.Box(m, at(cart, 0, 2.6, 0), Vector3.new(6, 3.4, 3), WHITE)
	Build.Box(m, at(cart, 0, 4.4, 0), Vector3.new(6.2, 0.3, 3.2), rgb(240, 130, 180))
	Furniture.Parasol(m, cart, rgb(240, 130, 180))
	for _, x in { -2.2, 2.2 } do
		local wheel = Build.New("Part", {
			Shape = Enum.PartType.Cylinder,
			Size = Vector3.new(0.4, 1.8, 1.8),
			CFrame = at(cart, x, 0.9, 1.6) * CFrame.Angles(0, PI / 2, 0),
			Color = C.Black,
			Parent = m,
		})
		wheel.Name = "Wiel"
	end
	sign(m, at(cart, 0, 2.8, -1.6), Vector3.new(5, 1.4, 0.1), "🍦 IJS", rgb(240, 130, 180), WHITE)
end

------------------------------------------------------------------------
-- Strand
------------------------------------------------------------------------

function Buildings.Beach(parent: Instance, z1: number, z2: number, world: any)
	local m = newModel("Strand", parent)
	local rng = Furniture.Random
	-- strandwachttoren
	local tower = CFrame.new(-120, 0, z1 + 50)
	for _, sx in { -1, 1 } do
		for _, sz in { -1, 1 } do
			Build.Box(m, at(tower, sx * 2.5, 5, sz * 2.5), Vector3.new(0.6, 10, 0.6), WHITE)
		end
	end
	Build.Box(m, at(tower, 0, 10.2, 0), Vector3.new(7, 0.4, 7), WHITE)
	Build.Box(m, at(tower, 0, 12.5, 0), Vector3.new(6, 4.4, 6), rgb(220, 50, 50))
	Build.Box(m, at(tower, 0, 15, 0), Vector3.new(7, 0.6, 7), rgb(250, 205, 40))
	Build.Box(m, at(tower, 0, 5, -5) * CFrame.Angles(0.6, 0, 0), Vector3.new(2.4, 0.3, 12), C.Wood, M.Wood)
	-- parasols en ligbedden
	local colors = { rgb(240, 80, 80), rgb(60, 140, 230), rgb(250, 205, 40), rgb(80, 190, 110) }
	for i = 0, 9 do
		local x = -260 + i * 56 + rng:NextNumber(-8, 8)
		local spot = CFrame.new(x, 0, z1 + 40 + rng:NextNumber(-10, 10))
		Furniture.Parasol(m, spot, colors[i % #colors + 1])
		Furniture.Sunbed(m, at(spot, -3, 0, 1))
		Furniture.Sunbed(m, at(spot, 3, 0, 1))
	end
	-- volleybalnet
	local net = CFrame.new(80, 0, z1 + 45)
	for _, s in { -1, 1 } do
		Build.Box(m, at(net, s * 12, 4, 0), Vector3.new(0.5, 8, 0.5), WHITE)
	end
	Build.Box(m, at(net, 0, 6.5, 0), Vector3.new(24, 3, 0.1), WHITE).Transparency = 0.5
	-- palmbomen
	for i = 0, 13 do
		Furniture.Palm(m, Vector3.new(-330 + i * 50 + rng:NextNumber(-10, 10), 0, z1 + 12 + rng:NextNumber(-4, 8)))
	end
	-- strandtent
	local cafe = CFrame.new(220, 0, z1 + 30)
	Build.Box(m, at(cafe, 0, 0.5, 0), Vector3.new(30, 1, 20), C.Wood, M.WoodPlanks)
	for _, sx in { -1, 1 } do
		for _, sz in { -1, 1 } do
			Build.Box(m, at(cafe, sx * 14, 6, sz * 9), Vector3.new(0.8, 10, 0.8), C.Wood, M.Wood)
		end
	end
	Build.Box(m, at(cafe, 0, 11.2, 0), Vector3.new(32, 0.6, 22), rgb(230, 200, 140), M.Fabric)
	local bar = Furniture.Counter(m, at(cafe, 0, 1, 6), 16, C.Wood)
	menuPrompt(world, bar, "Bestellen", "Strandtent", "Food:Snackbar")
	addCounter(world, "Snackbar", bar.CFrame.Position)
	for _, x in { -6, 0, 6 } do
		Furniture.Stool(m, at(cafe, x, 1, 3.6) * rot(PI))
	end
	sign(m, at(cafe, 0, 9, -10.2), Vector3.new(14, 2.4, 0.3), "🌴 STRANDTENT", rgb(60, 140, 230), WHITE)
end

return Buildings
