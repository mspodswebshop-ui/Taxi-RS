-- Furniture: meubels en decoratie.
-- Elke functie krijgt (parent, cf) waarbij cf op de vloer staat en de voorkant -Z is.
-- Bij stoelen en banken kijk je als je zit naar de -Z kant.

local Build = require(script.Parent.Build)

local Furniture = {}

local function rgb(r: number, g: number, b: number): Color3
	return Color3.fromRGB(r, g, b)
end

local C = {
	Wood = rgb(160, 115, 75),
	DarkWood = rgb(92, 62, 42),
	White = rgb(245, 245, 245),
	Black = rgb(30, 30, 34),
	Metal = rgb(150, 152, 160),
	Marble = rgb(235, 235, 232),
	Leaves = rgb(58, 140, 60),
	Leaves2 = rgb(74, 158, 70),
	Pine = rgb(40, 100, 55),
	Trunk = rgb(105, 72, 45),
	Screen = rgb(35, 80, 190),
}
Furniture.Colors = C

local rng = Random.new(77)
Furniture.Random = rng

local function at(cf: CFrame, x: number, y: number, z: number): CFrame
	return cf * CFrame.new(x, y, z)
end
Furniture.At = at

local function box(p: Instance, cf: CFrame, size: Vector3, color: Color3, mat: Enum.Material?): Part
	return Build.Box(p, cf, size, color, mat)
end

function Furniture.Seat(parent: Instance, cf: CFrame, size: Vector3, color: Color3, material: Enum.Material?): Seat
	return Build.New("Seat", {
		CFrame = cf,
		Size = size,
		Color = color,
		Material = material or Enum.Material.Fabric,
		Parent = parent,
	})
end
local seat = Furniture.Seat

------------------------------------------------------------------------
-- Woonkamer
------------------------------------------------------------------------

function Furniture.Chair(p: Instance, cf: CFrame, color: Color3?)
	local c = color or C.Wood
	for _, sx in { -1, 1 } do
		for _, sz in { -1, 1 } do
			box(p, at(cf, sx * 0.75, 0.8, sz * 0.75), Vector3.new(0.25, 1.6, 0.25), C.Black, Enum.Material.Metal)
		end
	end
	seat(p, at(cf, 0, 1.8, 0), Vector3.new(2, 0.4, 2), c)
	box(p, at(cf, 0, 3.2, 0.85), Vector3.new(2, 2.4, 0.3), c, Enum.Material.Fabric)
end

function Furniture.Stool(p: Instance, cf: CFrame, color: Color3?)
	Build.Cylinder(p, at(cf, 0, 1.3, 0), 2.6, 0.3, C.Metal, Enum.Material.Metal)
	Build.Cylinder(p, at(cf, 0, 0.05, 0), 0.1, 1.4, C.Metal, Enum.Material.Metal)
	seat(p, at(cf, 0, 2.75, 0), Vector3.new(1.6, 0.4, 1.6), color or C.Black, Enum.Material.Leather)
end

function Furniture.Table(p: Instance, cf: CFrame, w: number, d: number, color: Color3?, material: Enum.Material?)
	local c = color or C.Wood
	box(p, at(cf, 0, 3, 0), Vector3.new(w, 0.3, d), c, material or Enum.Material.Wood)
	for _, sx in { -1, 1 } do
		for _, sz in { -1, 1 } do
			box(p, at(cf, sx * (w / 2 - 0.4), 1.45, sz * (d / 2 - 0.4)), Vector3.new(0.35, 2.9, 0.35), C.Black, Enum.Material.Metal)
		end
	end
end

-- Eettafel met stoelen eromheen
function Furniture.DiningSet(p: Instance, cf: CFrame, chairsPerSide: number, color: Color3?)
	local w = chairsPerSide * 3 + 1
	Furniture.Table(p, cf, w, 4.4, color or C.Wood)
	for i = 1, chairsPerSide do
		local x = -w / 2 + 0.5 + (i - 0.5) * 3
		Furniture.Chair(p, at(cf, x, 0, -3.2) * CFrame.Angles(0, math.pi, 0), C.White)
		Furniture.Chair(p, at(cf, x, 0, 3.2), C.White)
	end
end

function Furniture.Sofa(p: Instance, cf: CFrame, width: number, color: Color3)
	box(p, at(cf, 0, 0.5, 0), Vector3.new(width, 1, 3.2), color, Enum.Material.Fabric)
	seat(p, at(cf, 0, 1.25, -0.2), Vector3.new(width - 0.2, 0.5, 2.8), color)
	box(p, at(cf, 0, 2.2, 1.5), Vector3.new(width, 2.6, 0.8), color, Enum.Material.Fabric)
	for _, s in { -1, 1 } do
		box(p, at(cf, s * (width / 2 + 0.4), 1.3, 0.2), Vector3.new(0.8, 2, 3.6), color, Enum.Material.Fabric)
		box(p, at(cf, s * (width / 2 - 1.5), 2.3, 0.8), Vector3.new(1.6, 1.6, 0.5), rgb(235, 225, 205), Enum.Material.Fabric)
	end
end

-- Hoekbank (L-vorm)
function Furniture.CornerSofa(p: Instance, cf: CFrame, width: number, color: Color3)
	Furniture.Sofa(p, cf, width, color)
	local side = at(cf, width / 2 + 2.2, 0, -2.4) * CFrame.Angles(0, math.pi / 2, 0)
	box(p, at(side, 0, 0.5, 0), Vector3.new(5, 1, 3.2), color, Enum.Material.Fabric)
	seat(p, at(side, 0, 1.25, -0.2), Vector3.new(4.8, 0.5, 2.8), color)
end

function Furniture.CoffeeTable(p: Instance, cf: CFrame)
	box(p, at(cf, 0, 1.2, 0), Vector3.new(5, 0.3, 3), C.Wood, Enum.Material.Wood)
	box(p, at(cf, 0, 0.55, 0), Vector3.new(4.4, 1, 2.4), C.Black)
	Build.Cylinder(p, at(cf, 1, 1.6, 0), 0.6, 0.8, rgb(230, 230, 240), Enum.Material.Glass)
end

function Furniture.TV(p: Instance, cf: CFrame, big: boolean?)
	local w = big and 10 or 7
	box(p, at(cf, 0, 0.9, 0.2), Vector3.new(w - 1, 1.8, 1.6), C.Black, Enum.Material.Wood)
	box(p, at(cf, 0, 4.4, 0.6), Vector3.new(w, w * 0.56, 0.25), C.Black)
	box(p, at(cf, 0, 4.4, 0.45), Vector3.new(w - 0.4, w * 0.56 - 0.4, 0.05), C.Screen, Enum.Material.Neon)
end

function Furniture.Rug(p: Instance, cf: CFrame, w: number, d: number, color: Color3)
	box(p, at(cf, 0, 0.05, 0), Vector3.new(w, 0.1, d), color, Enum.Material.Fabric)
end

function Furniture.Plant(p: Instance, cf: CFrame, tall: boolean?)
	Build.Cylinder(p, at(cf, 0, 0.9, 0), 1.8, 1.8, rgb(230, 230, 230), Enum.Material.Concrete)
	if tall then
		Build.Cylinder(p, at(cf, 0, 3, 0), 3, 0.3, C.Trunk, Enum.Material.Wood)
		Build.Ball(p, at(cf, 0, 5.2, 0), 3, C.Leaves, Enum.Material.Grass)
	else
		Build.Ball(p, at(cf, 0, 2.6, 0), 2.6, C.Leaves, Enum.Material.Grass)
	end
end

function Furniture.FloorLamp(p: Instance, cf: CFrame)
	Build.Cylinder(p, at(cf, 0, 0.1, 0), 0.2, 1.4, C.Black, Enum.Material.Metal)
	Build.Cylinder(p, at(cf, 0, 3, 0), 6, 0.2, C.Black, Enum.Material.Metal)
	local shade = Build.Cylinder(p, at(cf, 0, 6.2, 0), 1.2, 1.8, rgb(250, 240, 215), Enum.Material.Fabric)
	Build.Light(shade, rgb(255, 225, 180), 14, 0.8)
end

function Furniture.CeilingLight(p: Instance, cf: CFrame, range: number?)
	local lamp = Build.Cylinder(p, cf, 0.2, 2.2, rgb(255, 245, 225), Enum.Material.Neon)
	Build.Light(lamp, rgb(255, 235, 205), range or 26, 0.9)
	return lamp
end

function Furniture.Bookshelf(p: Instance, cf: CFrame, w: number?)
	local width = w or 5
	box(p, at(cf, 0, 3.5, 0), Vector3.new(width, 7, 1.4), C.DarkWood, Enum.Material.Wood)
	local colors = { rgb(190, 50, 50), rgb(50, 90, 170), rgb(60, 140, 80), rgb(220, 180, 60), rgb(240, 240, 240) }
	for shelf = 0, 3 do
		local x = -width / 2 + 0.4
		while x < width / 2 - 0.6 do
			local bw = rng:NextNumber(0.3, 0.6)
			local bh = rng:NextNumber(1, 1.4)
			box(p, at(cf, x + bw / 2, 0.6 + shelf * 1.7 + bh / 2, -0.75), Vector3.new(bw, bh, 0.15), colors[rng:NextInteger(1, #colors)])
			x += bw + 0.05
		end
	end
end

function Furniture.Piano(p: Instance, cf: CFrame)
	box(p, at(cf, 0, 2.1, 0.5), Vector3.new(6, 4.2, 2.5), C.Black)
	box(p, at(cf, 0, 2.9, -1), Vector3.new(5.6, 0.25, 1), C.White)
	box(p, at(cf, 0, 3.05, -1.2), Vector3.new(5.6, 0.1, 0.4), C.Black)
	seat(p, at(cf, 0, 1.6, -3), Vector3.new(3, 0.4, 1.4), C.Black, Enum.Material.Leather)
end

function Furniture.PoolTable(p: Instance, cf: CFrame)
	box(p, at(cf, 0, 2.7, 0), Vector3.new(6, 0.6, 10), C.DarkWood, Enum.Material.Wood)
	box(p, at(cf, 0, 3.02, 0), Vector3.new(5, 0.05, 9), rgb(30, 120, 60), Enum.Material.Fabric)
	box(p, at(cf, 0, 1.2, 0), Vector3.new(4, 2.4, 8), C.DarkWood, Enum.Material.Wood)
	local colors = { rgb(240, 240, 240), rgb(220, 50, 50), rgb(250, 200, 40), rgb(40, 80, 200), rgb(20, 20, 20) }
	for i, color in colors do
		Build.Ball(p, at(cf, (i - 3) * 0.5, 3.3, -2 + (i % 2) * 0.5), 0.5, color)
	end
end

------------------------------------------------------------------------
-- Keuken
------------------------------------------------------------------------

function Furniture.Counter(p: Instance, cf: CFrame, length: number, color: Color3?): Part
	box(p, at(cf, 0, 1.7, 0), Vector3.new(length, 3.4, 2.6), color or C.White)
	return box(p, at(cf, 0, 3.55, 0), Vector3.new(length + 0.2, 0.3, 2.8), rgb(55, 55, 60), Enum.Material.Marble)
end

-- Keukenblok tegen de muur met kookplaat, gootsteen en kastjes erboven
function Furniture.Kitchen(p: Instance, cf: CFrame, length: number, color: Color3?)
	local c = color or C.White
	Furniture.Counter(p, cf, length, c)
	box(p, at(cf, -length / 4, 3.72, 0), Vector3.new(2.4, 0.05, 1.8), C.Black)
	box(p, at(cf, length / 4, 3.6, 0), Vector3.new(2.2, 0.1, 1.6), C.Metal, Enum.Material.Metal)
	Build.Cylinder(p, at(cf, length / 4, 4.3, 0.9), 1.4, 0.25, C.Metal, Enum.Material.Metal)
	box(p, at(cf, 0, 7.6, 0.6), Vector3.new(length, 2.6, 1.4), c)
	box(p, at(cf, -length / 4, 6.2, 0.6), Vector3.new(2.6, 0.4, 1.4), C.Metal, Enum.Material.Metal)
end

function Furniture.Fridge(p: Instance, cf: CFrame)
	box(p, at(cf, 0, 3.6, 0), Vector3.new(3.4, 7.2, 3), rgb(215, 218, 224), Enum.Material.Metal)
	box(p, at(cf, 1.2, 4.6, -1.55), Vector3.new(0.2, 2.4, 0.2), C.Black, Enum.Material.Metal)
	box(p, at(cf, 0, 2.6, -1.52), Vector3.new(3.3, 0.08, 0.05), C.Black)
end

-- Kookeiland met barkrukken aan de voorkant
function Furniture.Island(p: Instance, cf: CFrame, length: number)
	box(p, at(cf, 0, 1.7, 0), Vector3.new(length, 3.4, 3), C.Black)
	box(p, at(cf, 0, 3.55, -0.4), Vector3.new(length + 0.4, 0.3, 4), C.Marble, Enum.Material.Marble)
	local count = math.floor(length / 2.6)
	for i = 1, count do
		local x = -length / 2 + (i - 0.5) * length / count
		Furniture.Stool(p, at(cf, x, 0, -3.4) * CFrame.Angles(0, math.pi, 0))
	end
	for i = -1, 1 do
		local lamp = Build.Ball(p, at(cf, i * length / 3, 9.2, 0), 1, rgb(255, 240, 210), Enum.Material.Neon)
		if i == 0 then
			Build.Light(lamp, rgb(255, 230, 190), 18, 0.8)
		end
	end
end

------------------------------------------------------------------------
-- Slaapkamer en badkamer
------------------------------------------------------------------------

function Furniture.Bed(p: Instance, cf: CFrame, color: Color3, wide: boolean?, noNightstands: boolean?)
	local w = wide and 9 or 6
	box(p, at(cf, 0, 0.7, 0), Vector3.new(w, 1.4, 9.5), C.DarkWood, Enum.Material.Wood)
	seat(p, at(cf, 0, 1.75, 0), Vector3.new(w - 0.4, 0.7, 9), C.White)
	box(p, at(cf, 0, 2.15, -1.5), Vector3.new(w - 0.1, 0.3, 6), color, Enum.Material.Fabric)
	for _, s in (wide and { -1, 1 } or { 0 }) :: { number } do
		box(p, at(cf, s * w / 4, 2.35, 3.5), Vector3.new(wide and 3.4 or 4, 0.6, 1.6), C.White, Enum.Material.Fabric)
	end
	box(p, at(cf, 0, 2.6, 4.95), Vector3.new(w + 0.4, 5.2, 0.5), C.DarkWood, Enum.Material.Wood)
	for _, s in (noNightstands and {} or { -1, 1 }) :: { number } do
		box(p, at(cf, s * (w / 2 + 1.3), 1, 4), Vector3.new(2, 2, 2), C.White)
		local lamp = Build.Ball(p, at(cf, s * (w / 2 + 1.3), 2.6, 4), 1, rgb(255, 240, 210), Enum.Material.Neon)
		Build.Light(lamp, rgb(255, 225, 180), 10, 0.6)
	end
end

function Furniture.Wardrobe(p: Instance, cf: CFrame, w: number?)
	local width = w or 6
	box(p, at(cf, 0, 4, 0), Vector3.new(width, 8, 2.6), C.White)
	box(p, at(cf, 0, 4, -1.32), Vector3.new(0.1, 7.6, 0.05), rgb(200, 200, 200))
	for _, s in { -1, 1 } do
		box(p, at(cf, s * 0.5, 4, -1.4), Vector3.new(0.15, 1.6, 0.15), C.Black, Enum.Material.Metal)
	end
end

function Furniture.Desk(p: Instance, cf: CFrame, withChair: boolean?)
	Furniture.Table(p, cf, 6, 3, rgb(235, 235, 235), Enum.Material.SmoothPlastic)
	box(p, at(cf, 0, 4.3, 0.7), Vector3.new(3, 1.9, 0.2), C.Black)
	box(p, at(cf, 0, 4.3, 0.58), Vector3.new(2.7, 1.6, 0.05), C.Screen, Enum.Material.Neon)
	box(p, at(cf, 0, 3.2, -0.4), Vector3.new(2, 0.1, 0.7), C.Black)
	if withChair ~= false then
		Furniture.Chair(p, at(cf, 0, 0, -2.6) * CFrame.Angles(0, math.pi, 0), rgb(40, 40, 45))
	end
end

function Furniture.Bathtub(p: Instance, cf: CFrame)
	box(p, at(cf, 0, 1.2, 0), Vector3.new(4.4, 2.4, 8), C.White, Enum.Material.Marble)
	local water = box(p, at(cf, 0, 2.3, 0), Vector3.new(3.6, 0.2, 7.2), rgb(120, 190, 235), Enum.Material.Glass)
	water.Transparency = 0.3
	seat(p, at(cf, 0, 1.6, 1), Vector3.new(3, 0.3, 3), C.White, Enum.Material.Marble).Transparency = 1
	Build.Cylinder(p, at(cf, 0, 3, 3.7), 1.2, 0.3, C.Metal, Enum.Material.Metal)
end

function Furniture.Toilet(p: Instance, cf: CFrame)
	box(p, at(cf, 0, 0.8, 0.2), Vector3.new(1.6, 1.6, 2.2), C.White, Enum.Material.Marble)
	seat(p, at(cf, 0, 1.75, 0), Vector3.new(1.7, 0.3, 2), C.White, Enum.Material.SmoothPlastic)
	box(p, at(cf, 0, 2.6, 1.2), Vector3.new(1.8, 2, 0.8), C.White, Enum.Material.Marble)
end

function Furniture.Sink(p: Instance, cf: CFrame)
	box(p, at(cf, 0, 1.5, 0), Vector3.new(3, 3, 2), C.DarkWood, Enum.Material.Wood)
	box(p, at(cf, 0, 3.1, 0), Vector3.new(2.4, 0.3, 1.6), C.White, Enum.Material.Marble)
	box(p, at(cf, 0, 5.5, 0.9), Vector3.new(2.6, 3, 0.1), rgb(200, 225, 240), Enum.Material.Glass).Reflectance = 0.5
end

------------------------------------------------------------------------
-- Winkels, kantoor, ziekenhuis, school
------------------------------------------------------------------------

local PRODUCT_COLORS = {
	rgb(220, 60, 60),
	rgb(250, 200, 60),
	rgb(60, 140, 220),
	rgb(80, 180, 90),
	rgb(240, 240, 240),
	rgb(240, 130, 40),
	rgb(170, 90, 200),
}

function Furniture.StoreShelf(p: Instance, cf: CFrame, length: number)
	box(p, at(cf, 0, 3.5, 0), Vector3.new(length, 7, 0.4), C.White)
	for level = 0, 3 do
		local y = 0.6 + level * 1.7
		for _, side in { -1, 1 } do
			box(p, at(cf, 0, y, side * 0.9), Vector3.new(length, 0.2, 1.4), C.White)
			local x = -length / 2 + 0.5
			while x < length / 2 - 0.5 do
				local w = rng:NextNumber(0.6, 1)
				local h = rng:NextNumber(0.6, 1.3)
				box(p, at(cf, x + w / 2, y + 0.1 + h / 2, side * 1), Vector3.new(w, h, 0.9), PRODUCT_COLORS[rng:NextInteger(1, #PRODUCT_COLORS)])
				x += w + 0.15
			end
		end
	end
end

function Furniture.Checkout(p: Instance, cf: CFrame): Part
	box(p, at(cf, 0, 1.7, 0), Vector3.new(3, 3.4, 8), rgb(60, 60, 70))
	local top = box(p, at(cf, 0, 3.5, 0), Vector3.new(3.2, 0.2, 8.2), C.Black)
	box(p, at(cf, -1, 4.3, 2.5), Vector3.new(1.2, 1.4, 1.2), rgb(220, 220, 220))
	box(p, at(cf, -1, 5.2, 2.5), Vector3.new(1.2, 0.8, 0.1), C.Screen, Enum.Material.Neon)
	return top
end

function Furniture.HospitalBed(p: Instance, cf: CFrame)
	box(p, at(cf, 0, 1.2, 0), Vector3.new(4, 0.4, 8), C.Metal, Enum.Material.Metal)
	seat(p, at(cf, 0, 1.8, 0), Vector3.new(3.8, 0.8, 7.6), rgb(225, 240, 250))
	box(p, at(cf, 0, 2.5, 3.2), Vector3.new(3, 0.6, 1.4), C.White, Enum.Material.Fabric)
	box(p, at(cf, 0, 2.5, 4.1), Vector3.new(4, 3, 0.3), C.Metal, Enum.Material.Metal)
	for _, sx in { -1, 1 } do
		for _, sz in { -1, 1 } do
			box(p, at(cf, sx * 1.6, 0.5, sz * 3.4), Vector3.new(0.3, 1, 0.3), C.Black)
		end
	end
	Build.Cylinder(p, at(cf, 3, 3, 3), 6, 0.2, C.Metal, Enum.Material.Metal)
	box(p, at(cf, 3, 5.6, 3), Vector3.new(1.4, 1, 0.2), C.Black)
	box(p, at(cf, 3, 5.6, 2.88), Vector3.new(1.2, 0.8, 0.05), rgb(40, 220, 90), Enum.Material.Neon)
end

function Furniture.SchoolDesk(p: Instance, cf: CFrame)
	box(p, at(cf, 0, 2.6, 0), Vector3.new(3.4, 0.25, 2.2), rgb(210, 180, 130), Enum.Material.Wood)
	for _, s in { -1, 1 } do
		box(p, at(cf, s * 1.5, 1.25, 0), Vector3.new(0.25, 2.5, 2), C.Metal, Enum.Material.Metal)
	end
	Furniture.Chair(p, at(cf, 0, 0, -2.2) * CFrame.Angles(0, math.pi, 0), rgb(60, 120, 200))
end

function Furniture.Whiteboard(p: Instance, cf: CFrame, text: string?)
	local board = box(p, at(cf, 0, 5.5, 0), Vector3.new(14, 5, 0.2), C.White)
	box(p, at(cf, 0, 5.5, 0.1), Vector3.new(14.4, 5.4, 0.1), C.Metal, Enum.Material.Metal)
	if text then
		Build.Sign(board, text, rgb(40, 60, 160))
	end
end

------------------------------------------------------------------------
-- Buiten
------------------------------------------------------------------------

function Furniture.Tree(p: Instance, pos: Vector3, scale: number?)
	local s = scale or 1
	Build.Cylinder(p, CFrame.new(pos + Vector3.new(0, 4 * s, 0)), 8 * s, 1.4 * s, C.Trunk, Enum.Material.Wood)
	Build.Ball(p, CFrame.new(pos + Vector3.new(0, 10 * s, 0)), 9 * s, C.Leaves, Enum.Material.Grass)
	Build.Ball(p, CFrame.new(pos + Vector3.new(2 * s, 12 * s, 1 * s)), 6.5 * s, C.Leaves2, Enum.Material.Grass)
	Build.Ball(p, CFrame.new(pos + Vector3.new(-1.8 * s, 11.5 * s, -1.2 * s)), 6 * s, C.Leaves2, Enum.Material.Grass)
end

-- Dennenboom (laag-poly, zoals in Brookhaven)
function Furniture.Pine(p: Instance, pos: Vector3, scale: number?)
	local s = scale or 1
	Build.Cylinder(p, CFrame.new(pos + Vector3.new(0, 3 * s, 0)), 6 * s, 1.2 * s, C.Trunk, Enum.Material.Wood)
	for i = 0, 3 do
		local size = (9 - i * 2) * s
		local cf = CFrame.new(pos + Vector3.new(0, (5 + i * 3.2) * s, 0)) * CFrame.Angles(0, (i % 2) * math.pi / 4, 0)
		Build.Box(p, cf, Vector3.new(size, 3.4 * s, size), i % 2 == 0 and C.Pine or rgb(48, 115, 62), Enum.Material.Grass)
	end
end

function Furniture.Palm(p: Instance, pos: Vector3)
	for i = 0, 4 do
		Build.Cylinder(p, CFrame.new(pos + Vector3.new(i * 0.25, 1.4 + i * 2.6, 0)), 2.8, 1.1 - i * 0.08, rgb(150, 110, 70), Enum.Material.Wood)
	end
	local top = pos + Vector3.new(1.2, 13, 0)
	for i = 1, 7 do
		local cf = CFrame.new(top) * CFrame.Angles(0, i * math.pi * 2 / 7, 0) * CFrame.Angles(-0.4, 0, 0) * CFrame.new(0, 0, -3.4)
		Build.Box(p, cf, Vector3.new(1.6, 0.25, 7.5), rgb(60, 160, 60), Enum.Material.Grass)
	end
end

function Furniture.Bench(p: Instance, cf: CFrame)
	seat(p, at(cf, 0, 1.6, 0), Vector3.new(5, 0.4, 1.6), C.Wood, Enum.Material.Wood)
	box(p, at(cf, 0, 2.6, 0.75), Vector3.new(5, 1.6, 0.3), C.Wood, Enum.Material.Wood)
	for _, s in { -1, 1 } do
		box(p, at(cf, s * 2, 0.7, 0), Vector3.new(0.3, 1.4, 1.4), C.Black, Enum.Material.Metal)
	end
end

function Furniture.Hedge(p: Instance, cf: CFrame, length: number, height: number?)
	box(p, at(cf, 0, (height or 3) / 2, 0), Vector3.new(length, height or 3, 2), rgb(50, 120, 50), Enum.Material.Grass)
end

function Furniture.Flowerbed(p: Instance, cf: CFrame, w: number, d: number)
	box(p, at(cf, 0, 0.4, 0), Vector3.new(w, 0.8, d), rgb(90, 60, 40), Enum.Material.Ground)
	local colors = { rgb(240, 80, 120), rgb(250, 220, 60), rgb(245, 245, 255), rgb(170, 90, 230) }
	for _ = 1, math.floor(w * d / 5) do
		local x = rng:NextNumber(-w / 2 + 0.6, w / 2 - 0.6)
		local z = rng:NextNumber(-d / 2 + 0.6, d / 2 - 0.6)
		Build.Ball(p, at(cf, x, 1.1, z), 0.9, colors[rng:NextInteger(1, #colors)])
	end
end

function Furniture.Parasol(p: Instance, cf: CFrame, color: Color3)
	Build.Cylinder(p, at(cf, 0, 4, 0), 8, 0.3, C.White)
	Build.Cylinder(p, at(cf, 0, 8.1, 0), 0.4, 9, color, Enum.Material.Fabric)
end

function Furniture.Sunbed(p: Instance, cf: CFrame)
	box(p, at(cf, 0, 0.6, 0), Vector3.new(2.8, 1.2, 6.5), C.White)
	seat(p, at(cf, 0, 1.3, -0.5), Vector3.new(2.6, 0.3, 4.6), rgb(240, 240, 240))
	box(p, at(cf, 0, 1.9, 2.6), Vector3.new(2.6, 0.4, 2), rgb(240, 240, 240), Enum.Material.Fabric)
end

function Furniture.BBQ(p: Instance, cf: CFrame)
	box(p, at(cf, 0, 1.5, 0), Vector3.new(3, 3, 2), C.Black, Enum.Material.Metal)
	box(p, at(cf, 0, 3.1, 0), Vector3.new(2.6, 0.1, 1.6), rgb(230, 100, 30), Enum.Material.Neon)
end

-- Straatlantaarn. Geeft het lampdeel terug (voor dag en nacht).
function Furniture.StreetLamp(p: Instance, pos: Vector3, facing: Vector3?): Part
	local dir = facing or Vector3.new(1, 0, 0)
	Build.Cylinder(p, CFrame.new(pos + Vector3.new(0, 0.4, 0)), 0.8, 1.4, rgb(50, 52, 58), Enum.Material.Metal)
	Build.Cylinder(p, CFrame.new(pos + Vector3.new(0, 7.5, 0)), 15, 0.55, rgb(50, 52, 58), Enum.Material.Metal)
	local armCenter = pos + Vector3.new(0, 15, 0) + dir * 1.8
	Build.Box(p, CFrame.lookAt(armCenter, armCenter + dir), Vector3.new(0.4, 0.4, 3.6), rgb(50, 52, 58), Enum.Material.Metal)
	local lampPos = pos + Vector3.new(0, 14.6, 0) + dir * 3.4
	local lamp = Build.Box(p, CFrame.lookAt(lampPos, lampPos + dir), Vector3.new(1.4, 0.4, 2.2), rgb(255, 240, 200))
	local light = Instance.new("SpotLight")
	light.Face = Enum.NormalId.Bottom
	light.Angle = 110
	light.Range = 40
	light.Brightness = 2.5
	light.Color = rgb(255, 222, 170)
	light.Enabled = false
	light.Parent = lamp
	return lamp
end

function Furniture.TrafficLight(p: Instance, cf: CFrame)
	Build.Cylinder(p, at(cf, 0, 5, 0), 10, 0.5, rgb(50, 52, 58), Enum.Material.Metal)
	box(p, at(cf, 0, 11, 0), Vector3.new(1.4, 3.6, 1.2), C.Black)
	for i, color in { rgb(220, 40, 40), rgb(240, 180, 30), rgb(40, 200, 80) } do
		local lamp = Build.Ball(p, at(cf, 0, 12.2 - (i - 1) * 1.15, -0.55), 0.8, color, Enum.Material.Neon)
		lamp.Transparency = i == 3 and 0 or 0.6
	end
end

-- Basketbalpaal; de ring hangt aan de -Z kant
function Furniture.Hoop(p: Instance, cf: CFrame)
	Build.Cylinder(p, at(cf, 0, 5.5, 1.6), 11, 0.6, C.Metal, Enum.Material.Metal)
	box(p, at(cf, 0, 10.5, 1.6), Vector3.new(0.5, 0.5, 2), C.Metal, Enum.Material.Metal)
	box(p, at(cf, 0, 11, 0.5), Vector3.new(6, 3.6, 0.25), C.White)
	box(p, at(cf, 0, 10.6, 0.36), Vector3.new(2, 1.4, 0.05), rgb(220, 60, 40))
	local orange = rgb(240, 110, 30)
	box(p, at(cf, 0, 9.6, -0.1), Vector3.new(1.8, 0.12, 0.12), orange, Enum.Material.Metal)
	box(p, at(cf, 0, 9.6, -1.7), Vector3.new(1.8, 0.12, 0.12), orange, Enum.Material.Metal)
	box(p, at(cf, -0.9, 9.6, -0.9), Vector3.new(0.12, 0.12, 1.7), orange, Enum.Material.Metal)
	box(p, at(cf, 0.9, 9.6, -0.9), Vector3.new(0.12, 0.12, 1.7), orange, Enum.Material.Metal)
end

-- Sportveld met lijnen en twee basketbalpalen (lengte langs Z)
function Furniture.Court(p: Instance, cf: CFrame, w: number, d: number, color: Color3)
	box(p, at(cf, 0, 0.1, 0), Vector3.new(w, 0.2, d), color, Enum.Material.Concrete)
	local white = rgb(245, 245, 245)
	local function line(x: number, z: number, sx: number, sz: number)
		box(p, at(cf, x, 0.22, z), Vector3.new(sx, 0.05, sz), white)
	end
	line(0, -d / 2 + 1, w - 2, 0.4)
	line(0, d / 2 - 1, w - 2, 0.4)
	line(-w / 2 + 1, 0, 0.4, d - 2)
	line(w / 2 - 1, 0, 0.4, d - 2)
	line(0, 0, w - 2, 0.4)
	for _, side in { -1, 1 } do
		line(-4, side * (d / 2 - 7), 0.4, 12)
		line(4, side * (d / 2 - 7), 0.4, 12)
		line(0, side * (d / 2 - 13), 8, 0.4)
		Furniture.Hoop(p, at(cf, 0, 0, side * (d / 2 - 1)) * CFrame.Angles(0, side == 1 and 0 or math.pi, 0))
	end
end

return Furniture
