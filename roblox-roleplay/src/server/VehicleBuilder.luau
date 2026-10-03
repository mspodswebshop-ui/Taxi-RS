-- VehicleBuilder: bouwt auto's, bussen, hulpdiensten en motoren uit losse onderdelen.
-- Voorkant van een voertuig = de -Z richting (LookVector).

local Build = require(script.Parent.Build)

local VehicleBuilder = {}

local function rgb(r: number, g: number, b: number): Color3
	return Color3.fromRGB(r, g, b)
end

local BLACK = rgb(25, 25, 28)
local DARK = rgb(45, 45, 50)
local CHROME = rgb(195, 195, 205)
local TINT = rgb(28, 36, 48)
local WHITE = rgb(245, 245, 245)
local NO_FRICTION = PhysicalProperties.new(0.7, 0, 0, 100, 1)

type CarStyle = {
	W: number,
	L: number,
	BodyH: number,
	Clear: number,
	CabinL: number,
	CabinZ: number,
	CabinH: number,
	Wheel: number,
	Seats: number,
	Slope: boolean?,
	Boxy: boolean?,
	Siren: { Color3 }?,
	Spoiler: boolean?,
	Bed: boolean?,
	Ladder: boolean?,
	Axles: { number }?,
	BodyColor: Color3?,
}

local CAR_STYLES: { [string]: CarStyle } = {
	Sedan = { W = 6.6, L = 14, BodyH = 2.3, Clear = 1.0, CabinL = 6.6, CabinZ = 1, CabinH = 2.5, Wheel = 2.7, Seats = 4, Slope = true },
	Taxi = { W = 6.6, L = 14, BodyH = 2.3, Clear = 1.0, CabinL = 6.6, CabinZ = 1, CabinH = 2.5, Wheel = 2.7, Seats = 4, Slope = true, BodyColor = rgb(30, 30, 34) },
	Police = { W = 6.8, L = 14.5, BodyH = 2.3, Clear = 1.0, CabinL = 6.6, CabinZ = 1, CabinH = 2.5, Wheel = 2.8, Seats = 4, Slope = true, Siren = { rgb(30, 80, 255), rgb(30, 80, 255) }, BodyColor = WHITE },
	Pickup = { W = 7, L = 16, BodyH = 2.8, Clear = 1.5, CabinL = 5.2, CabinZ = -1.8, CabinH = 2.7, Wheel = 3.3, Seats = 2, Slope = true, Bed = true },
	Van = { W = 7.2, L = 15, BodyH = 2.8, Clear = 1.1, CabinL = 12, CabinZ = 1.2, CabinH = 3.8, Wheel = 2.8, Seats = 4, Boxy = true },
	Ambulance = { W = 7.6, L = 17, BodyH = 3, Clear = 1.2, CabinL = 14, CabinZ = 1, CabinH = 4.6, Wheel = 3, Seats = 4, Boxy = true, Siren = { rgb(30, 80, 255), rgb(30, 80, 255) }, BodyColor = rgb(245, 220, 40) },
	Sports = { W = 6.8, L = 13.5, BodyH = 1.7, Clear = 0.8, CabinL = 5, CabinZ = 1, CabinH = 1.8, Wheel = 2.7, Seats = 2, Slope = true, Spoiler = true },
	Super = { W = 7.2, L = 14.5, BodyH = 1.5, Clear = 0.7, CabinL = 4.6, CabinZ = 0.8, CabinH = 1.6, Wheel = 2.7, Seats = 2, Slope = true, Spoiler = true },
	FireTruck = { W = 8.4, L = 26, BodyH = 3.6, Clear = 1.6, CabinL = 6, CabinZ = -8.5, CabinH = 4.2, Wheel = 3.6, Seats = 4, Boxy = true, Siren = { rgb(30, 80, 255), rgb(30, 80, 255) }, Ladder = true, Axles = { -8.5, 5.5, 9.5 }, BodyColor = rgb(200, 30, 30) },
	Bus = { W = 8.4, L = 30, BodyH = 2.6, Clear = 1.3, CabinL = 28, CabinZ = 0.6, CabinH = 5, Wheel = 3.4, Seats = 12, Boxy = true, Axles = { -10, 10 }, BodyColor = rgb(250, 190, 20) },
}

local BIKE_STYLES = {
	Scooter = { W = 1.6, L = 5.5, Wheel = 2.0, FrameH = 1.6 },
	Motorbike = { W = 1.8, L = 7, Wheel = 2.6, FrameH = 1.6 },
	Dirtbike = { W = 1.5, L = 7, Wheel = 3.0, FrameH = 2.2 },
}

local function box(model: Instance, cf: CFrame, size: Vector3, color: Color3, mat: Enum.Material?): Part
	local p = Build.Box(model, cf, size, color, mat)
	return p
end

local function addWheel(model: Model, pos: Vector3, diameter: number, width: number, colliderX: number, visible: boolean?)
	if visible ~= false then
		Build.New("Part", {
			Name = "Wheel",
			Shape = Enum.PartType.Cylinder,
			Size = Vector3.new(width, diameter, diameter),
			CFrame = CFrame.new(pos),
			Color = BLACK,
			Material = Enum.Material.Rubber,
			CanCollide = false,
			Parent = model,
		})
		Build.New("Part", {
			Name = "Rim",
			Shape = Enum.PartType.Cylinder,
			Size = Vector3.new(width + 0.06, diameter * 0.6, diameter * 0.6),
			CFrame = CFrame.new(pos),
			Color = CHROME,
			Material = Enum.Material.Metal,
			CanCollide = false,
			Parent = model,
		})
		Build.New("Part", {
			Name = "Hub",
			Shape = Enum.PartType.Cylinder,
			Size = Vector3.new(width + 0.1, diameter * 0.2, diameter * 0.2),
			CFrame = CFrame.new(pos),
			Color = DARK,
			CanCollide = false,
			Parent = model,
		})
	end
	-- Onzichtbare bal die over de weg glijdt (makkelijk over stoepranden)
	Build.New("Part", {
		Name = "Collider",
		Shape = Enum.PartType.Ball,
		Size = Vector3.new(diameter, diameter, diameter),
		CFrame = CFrame.new(colliderX, pos.Y, pos.Z),
		Transparency = 1,
		CustomPhysicalProperties = NO_FRICTION,
		Parent = model,
	})
end

local function addSeat(model: Model, pos: Vector3, driver: boolean)
	local seat = Build.New(driver and "VehicleSeat" or "Seat", {
		Name = driver and "DriverSeat" or "PassengerSeat",
		Size = Vector3.new(1.8, 0.8, 1.8),
		CFrame = CFrame.new(pos),
		Color = DARK,
		Material = Enum.Material.Leather,
		CanCollide = false,
		CanTouch = false, -- instappen gaat via de "Instappen" knop
		Parent = model,
	})
	if driver then
		seat.HeadsUpDisplay = false
		seat.MaxSpeed = 0 -- de snelheid regelt VehicleService zelf
	end
	return seat
end

local function plate(model: Instance, cf: CFrame, face: Enum.NormalId)
	local p = box(model, cf, Vector3.new(2.6, 0.6, 0.1), rgb(245, 200, 30))
	p.CanCollide = false
	Build.Sign(p, "ZS-01-NL", BLACK, face)
end

local function lights(model: Model, s: CarStyle, y: number)
	for _, side in { -1, 1 } do
		local head = box(model, CFrame.new(side * (s.W / 2 - 1.1), y, -s.L / 2 - 0.05), Vector3.new(1.5, 0.55, 0.2), rgb(255, 250, 225), Enum.Material.Neon)
		head.CanCollide = false
		local spot = Instance.new("SpotLight")
		spot.Face = Enum.NormalId.Front
		spot.Range = 45
		spot.Angle = 60
		spot.Brightness = 2
		spot.Parent = head
		local tail = box(model, CFrame.new(side * (s.W / 2 - 1.1), y, s.L / 2 + 0.05), Vector3.new(1.5, 0.5, 0.2), rgb(220, 20, 20), Enum.Material.Neon)
		tail.CanCollide = false
		-- spiegels
		box(model, CFrame.new(side * (s.W / 2 + 0.35), s.Clear + s.BodyH + 0.5, s.CabinZ - s.CabinL / 2 + 0.6), Vector3.new(0.7, 0.5, 0.3), DARK)
	end
	-- grille en kentekens
	box(model, CFrame.new(0, y - 0.1, -s.L / 2 - 0.04), Vector3.new(s.W * 0.4, 0.7, 0.12), DARK)
	plate(model, CFrame.new(0, s.Clear + 0.45, -s.L / 2 - 0.3), Enum.NormalId.Front)
	plate(model, CFrame.new(0, s.Clear + 0.45, s.L / 2 + 0.3), Enum.NormalId.Back)
end

local function sirens(model: Model, s: CarStyle, y: number, z: number)
	local colors = s.Siren :: { Color3 }
	box(model, CFrame.new(0, y - 0.1, z), Vector3.new(3.8, 0.2, 1), DARK)
	local a = box(model, CFrame.new(-0.95, y + 0.2, z), Vector3.new(1.7, 0.45, 0.9), colors[1], Enum.Material.Neon)
	a.Name = "SirenRed"
	Build.Light(a, colors[1], 20, 3)
	local b = box(model, CFrame.new(0.95, y + 0.2, z), Vector3.new(1.7, 0.45, 0.9), colors[2], Enum.Material.Neon)
	b.Name = "SirenBlue"
	Build.Light(b, colors[2], 20, 3)
end

local function sideText(model: Model, s: CarStyle, y: number, z: number, length: number, text: string, color: Color3)
	for _, side in { -1, 1 } do
		local label = box(model, CFrame.new(side * (s.W / 2 + 0.06), y, z), Vector3.new(0.05, 0.9, length), WHITE)
		label.Transparency = 1
		label.CanCollide = false
		Build.Sign(label, text, color, side == 1 and Enum.NormalId.Right or Enum.NormalId.Left)
	end
end

local function buildCar(model: Model, style: string, color: Color3): BasePart
	local s = CAR_STYLES[style]
	local bodyY = s.Clear + s.BodyH / 2
	local topY = s.Clear + s.BodyH
	local paint = s.BodyColor or color

	local body = box(model, CFrame.new(0, bodyY, 0), Vector3.new(s.W, s.BodyH, s.L), paint)
	body.Name = "Chassis"
	body.Reflectance = 0.1
	body.CustomPhysicalProperties = NO_FRICTION

	-- onderkant, bumpers en wielkasten
	box(model, CFrame.new(0, s.Clear + 0.15, 0), Vector3.new(s.W - 0.2, 0.3, s.L + 0.6), DARK)
	box(model, CFrame.new(0, s.Clear + 0.45, -s.L / 2 - 0.2), Vector3.new(s.W, 0.7, 0.5), DARK)
	box(model, CFrame.new(0, s.Clear + 0.45, s.L / 2 + 0.2), Vector3.new(s.W, 0.7, 0.5), DARK)

	local cabinBottom = topY
	local cabinFront = s.CabinZ - s.CabinL / 2
	local cabinBack = s.CabinZ + s.CabinL / 2

	if s.Boxy then
		-- hoge cabine (bus, busje, ambulance, brandweer)
		box(model, CFrame.new(0, cabinBottom + s.CabinH / 2, s.CabinZ), Vector3.new(s.W - 0.2, s.CabinH, s.CabinL), paint)
		Build.Glass(model, CFrame.new(0, cabinBottom + s.CabinH * 0.55, cabinFront - 0.05), Vector3.new(s.W - 1, s.CabinH * 0.6, 0.15)).Transparency = 0.25
		for _, side in { -1, 1 } do
			local win = Build.Glass(model, CFrame.new(side * (s.W / 2 - 0.05), cabinBottom + s.CabinH * 0.6, s.CabinZ), Vector3.new(0.15, s.CabinH * 0.4, s.CabinL - 1.5))
			win.Color = TINT
			win.Transparency = 0.2
		end
	else
		-- personenauto: dak, stijlen en getinte ramen
		local glass = box(model, CFrame.new(0, cabinBottom + s.CabinH / 2, s.CabinZ), Vector3.new(s.W - 0.8, s.CabinH, s.CabinL), TINT, Enum.Material.Glass)
		glass.Transparency = 0.25
		glass.Reflectance = 0.2
		box(model, CFrame.new(0, cabinBottom + s.CabinH + 0.15, s.CabinZ), Vector3.new(s.W - 0.6, 0.3, s.CabinL + 0.2), paint).Reflectance = 0.1
		for _, side in { -1, 1 } do
			for _, z in { cabinFront + 0.15, s.CabinZ, cabinBack - 0.15 } do
				box(model, CFrame.new(side * (s.W / 2 - 0.4), cabinBottom + s.CabinH / 2, z), Vector3.new(0.25, s.CabinH, 0.3), paint)
			end
		end
		if s.Slope then
			-- schuine voorruit en achterruit
			local run = 1.6
			local length = math.sqrt(run * run + s.CabinH * s.CabinH)
			local angle = math.atan2(s.CabinH, run)
			local front = Build.Glass(model, CFrame.new(0, cabinBottom + s.CabinH / 2, cabinFront - run / 2) * CFrame.Angles(-angle, 0, 0), Vector3.new(s.W - 0.9, 0.15, length))
			front.Color = TINT
			front.Transparency = 0.25
			if not s.Bed then
				local back = Build.Glass(model, CFrame.new(0, cabinBottom + s.CabinH / 2, cabinBack + run / 2) * CFrame.Angles(angle, 0, 0), Vector3.new(s.W - 0.9, 0.15, length))
				back.Color = TINT
				back.Transparency = 0.25
			end
		end
		-- deurnaden
		for _, side in { -1, 1 } do
			box(model, CFrame.new(side * (s.W / 2 + 0.01), bodyY, s.CabinZ), Vector3.new(0.05, s.BodyH * 0.8, 0.08), DARK)
			box(model, CFrame.new(side * (s.W / 2 + 0.01), bodyY + 0.3, s.CabinZ - 1.2), Vector3.new(0.08, 0.15, 0.6), CHROME, Enum.Material.Metal)
		end
	end

	if s.Bed then
		local bedZ = cabinBack + 0.2
		local bedL = s.L / 2 - bedZ
		for _, side in { -1, 1 } do
			box(model, CFrame.new(side * (s.W / 2 - 0.2), topY + 0.6, bedZ + bedL / 2), Vector3.new(0.4, 1.2, bedL), paint)
		end
		box(model, CFrame.new(0, topY + 0.6, s.L / 2 - 0.2), Vector3.new(s.W, 1.2, 0.4), paint)
	end

	if s.Spoiler then
		box(model, CFrame.new(0, topY + 0.9, s.L / 2 - 0.8), Vector3.new(s.W - 0.4, 0.2, 1.2), BLACK)
		for _, side in { -1, 1 } do
			box(model, CFrame.new(side * (s.W / 2 - 1.2), topY + 0.45, s.L / 2 - 0.8), Vector3.new(0.3, 0.9, 0.5), BLACK)
			box(model, CFrame.new(side * (s.W / 2 + 0.01), bodyY, -s.L / 2 + 3), Vector3.new(0.05, 0.6, 2.2), BLACK)
		end
		box(model, CFrame.new(0, topY + 0.02, -s.L / 4 - 0.4), Vector3.new(1.1, 0.05, s.L / 2 - 2), WHITE)
	end

	if style == "Taxi" then
		local sign = box(model, CFrame.new(0, topY + s.CabinH + 0.65, s.CabinZ), Vector3.new(2.6, 0.8, 1.2), rgb(255, 230, 60), Enum.Material.Neon)
		Build.Sign(sign, "TAXI", BLACK, Enum.NormalId.Front)
		Build.Sign(sign, "TAXI", BLACK, Enum.NormalId.Back)
		sideText(model, s, bodyY, 0, 5, "TAXI", rgb(255, 210, 40))
	elseif style == "Police" then
		-- Nederlandse politiestriping: blauw met oranje
		for _, side in { -1, 1 } do
			box(model, CFrame.new(side * (s.W / 2 + 0.03), bodyY - 0.1, 0), Vector3.new(0.05, 0.9, s.L * 0.96), rgb(20, 60, 190))
			box(model, CFrame.new(side * (s.W / 2 + 0.04), bodyY - 0.65, 0), Vector3.new(0.05, 0.22, s.L * 0.96), rgb(250, 130, 20))
		end
		sideText(model, s, bodyY + 0.6, 0, 5, "POLITIE", rgb(20, 60, 190))
		sirens(model, s, topY + s.CabinH + 0.5, s.CabinZ)
	elseif style == "Ambulance" then
		for _, side in { -1, 1 } do
			for i = 0, 7 do
				local color = i % 2 == 0 and rgb(30, 80, 200) or rgb(60, 180, 90)
				box(model, CFrame.new(side * (s.W / 2 + 0.03), bodyY, -s.L / 2 + 1.5 + i * 2), Vector3.new(0.05, 1.2, 2), color)
			end
		end
		sideText(model, s, topY + 1.2, 1, 7, "AMBULANCE", rgb(30, 80, 200))
		sirens(model, s, topY + s.CabinH + 0.3, s.CabinZ - s.CabinL / 2 + 1)
	elseif style == "FireTruck" then
		-- opbouw met kasten en een ladder
		local boxZ = cabinBack + (s.L / 2 - cabinBack) / 2
		local boxL = s.L / 2 - cabinBack - 0.3
		box(model, CFrame.new(0, topY + 2, boxZ), Vector3.new(s.W - 0.2, 4, boxL), paint)
		for _, side in { -1, 1 } do
			for i = 0, 3 do
				box(model, CFrame.new(side * (s.W / 2 - 0.05), topY + 2, boxZ - boxL / 2 + 2 + i * (boxL - 2) / 4), Vector3.new(0.1, 3.2, boxL / 4 - 0.6), CHROME, Enum.Material.DiamondPlate)
			end
			box(model, CFrame.new(side * 1.4, topY + 4.6, boxZ - 2), Vector3.new(0.3, 0.4, boxL + 4), CHROME, Enum.Material.Metal)
			box(model, CFrame.new(side * (s.W / 2 + 0.03), bodyY, 0), Vector3.new(0.05, 0.5, s.L * 0.95), rgb(245, 220, 40))
		end
		for i = 0, 10 do
			box(model, CFrame.new(0, topY + 4.6, boxZ - boxL / 2 - 4 + i * 2), Vector3.new(2.8, 0.2, 0.2), CHROME, Enum.Material.Metal)
		end
		sideText(model, s, topY + s.CabinH * 0.25, s.CabinZ, 5, "112", WHITE)
		sirens(model, s, topY + s.CabinH + 0.3, s.CabinZ)
	elseif style == "Bus" then
		sideText(model, s, topY + 0.8, 0, 12, "SCHOOLBUS", BLACK)
		local front = box(model, CFrame.new(0, topY + s.CabinH - 0.6, cabinFront - 0.12), Vector3.new(5, 0.8, 0.1), BLACK)
		front.CanCollide = false
		Build.Sign(front, "SCHOOL", rgb(255, 200, 30), Enum.NormalId.Front)
	end

	lights(model, s, bodyY + 0.3)

	-- wielen
	local r = s.Wheel / 2
	local axles = s.Axles or { -(s.L / 2 - 2.6), s.L / 2 - 2.6 }
	for _, z in axles do
		for _, x in { -1, 1 } do
			addWheel(model, Vector3.new(x * (s.W / 2 - 0.3), r, z), s.Wheel, 1.3, x * (s.W / 2 - 1.5))
			box(model, CFrame.new(x * (s.W / 2 + 0.02), r + 0.4, z), Vector3.new(0.06, s.Wheel * 0.5, s.Wheel + 0.6), DARK)
		end
	end

	-- stoelen (bestuurder links, zoals in Nederland)
	local seatY = s.Clear + s.BodyH * 0.5
	local firstZ = s.Boxy and (cabinFront + 2) or (s.CabinZ - s.CabinL / 4)
	addSeat(model, Vector3.new(-s.W / 4, seatY, firstZ), true)
	local seats = 1
	local z = firstZ
	local right = true
	while seats < s.Seats do
		addSeat(model, Vector3.new(right and s.W / 4 or -s.W / 4, seatY, z), false)
		seats += 1
		if right then
			z += 3
		end
		right = not right
	end

	return body
end

local function buildBike(model: Model, style: string, color: Color3): BasePart
	local s = BIKE_STYLES[style]
	local r = s.Wheel / 2

	local frame = box(model, CFrame.new(0, r + 0.4, 0), Vector3.new(s.W, 1.2, s.L * 0.6), color)
	frame.Name = "Chassis"
	frame.Reflectance = 0.1
	frame.CustomPhysicalProperties = NO_FRICTION

	box(model, CFrame.new(0, r + 1.2, -s.L * 0.12), Vector3.new(s.W + 0.2, 0.9, s.L * 0.25), color)
	box(model, CFrame.new(0, r + 0.2, 0.3), Vector3.new(0.8, 0.8, 1.6), CHROME, Enum.Material.Metal)
	box(model, CFrame.new(0, r + s.FrameH, -s.L / 2 + r + 0.3), Vector3.new(0.3, s.FrameH, 0.3), CHROME, Enum.Material.Metal)
	box(model, CFrame.new(0, r + s.FrameH * 1.5, -s.L / 2 + r + 0.3), Vector3.new(3, 0.25, 0.25), BLACK)
	local head = box(model, CFrame.new(0, r + s.FrameH * 1.2, -s.L / 2 + r - 0.1), Vector3.new(0.8, 0.6, 0.3), rgb(255, 250, 220), Enum.Material.Neon)
	head.CanCollide = false
	local spot = Instance.new("SpotLight")
	spot.Face = Enum.NormalId.Front
	spot.Range = 35
	spot.Brightness = 2
	spot.Parent = head
	local tail = box(model, CFrame.new(0, r + 1, s.L * 0.3 + 0.05), Vector3.new(0.7, 0.4, 0.2), rgb(220, 20, 20), Enum.Material.Neon)
	tail.CanCollide = false
	box(model, CFrame.new(0, r + 1.1, s.L * 0.08), Vector3.new(1.4, 0.4, 2.6), BLACK, Enum.Material.Leather)

	if style == "Dirtbike" then
		box(model, CFrame.new(0, r * 2 + 0.2, -s.L / 2 + r), Vector3.new(1, 0.2, 1.6), color)
	end

	for _, z in { -1, 1 } do
		local p = Vector3.new(0, r, z * (s.L / 2 - r))
		addWheel(model, p, s.Wheel, 0.6, -0.9)
		addWheel(model, p, s.Wheel, 0.6, 0.9, false)
	end

	addSeat(model, Vector3.new(0, r + 1.0, s.L * 0.08), true)
	if style ~= "Dirtbike" then
		addSeat(model, Vector3.new(0, r + 1.0, s.L * 0.08 + 1.8), false)
	end
	return frame
end

-- Bouw een voertuig. anchored = true voor modellen die stil staan (showroom).
function VehicleBuilder.Build(def: any, color: Color3, cf: CFrame, anchored: boolean?): Model
	local model = Instance.new("Model")
	model.Name = def.Name

	local root: BasePart
	if BIKE_STYLES[def.Style] then
		root = buildBike(model, def.Style, color)
	else
		root = buildCar(model, def.Style, color)
	end
	model.PrimaryPart = root

	for _, part in model:GetDescendants() do
		if part:IsA("BasePart") and part ~= root then
			local weld = Instance.new("WeldConstraint")
			weld.Part0 = root
			weld.Part1 = part
			weld.Parent = root
			part.Massless = true
		end
	end

	-- Het voertuig is rond (0,0,0) gebouwd: verplaats alles samen naar cf
	model:PivotTo(cf * root.CFrame)

	if not anchored then
		for _, part in model:GetDescendants() do
			if part:IsA("BasePart") then
				part.Anchored = false
			end
		end
	end
	return model
end

return VehicleBuilder
