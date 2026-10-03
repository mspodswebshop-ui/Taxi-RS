-- VehicleBuilder: bouwt auto's en motoren uit losse onderdelen.
-- Voorkant van een voertuig = de -Z richting (LookVector).

local Build = require(script.Parent.Build)

local VehicleBuilder = {}

local BLACK = Color3.fromRGB(25, 25, 28)
local DARK = Color3.fromRGB(45, 45, 50)
local CHROME = Color3.fromRGB(190, 190, 200)
local WINDOW = Color3.fromRGB(35, 45, 60)
local NO_FRICTION = PhysicalProperties.new(0.7, 0, 0, 100, 1)

local CAR_STYLES = {
	Sedan = { W = 6.4, L = 13, BodyH = 2.2, Clear = 1.0, CabinL = 6.5, CabinZ = 0.8, CabinH = 2.4, Wheel = 2.6, Seats = 4 },
	Taxi = { W = 6.4, L = 13, BodyH = 2.2, Clear = 1.0, CabinL = 6.5, CabinZ = 0.8, CabinH = 2.4, Wheel = 2.6, Seats = 4 },
	Police = { W = 6.6, L = 13.5, BodyH = 2.2, Clear = 1.0, CabinL = 6.5, CabinZ = 0.8, CabinH = 2.4, Wheel = 2.7, Seats = 4 },
	Pickup = { W = 6.8, L = 15, BodyH = 2.6, Clear = 1.4, CabinL = 5, CabinZ = -1.6, CabinH = 2.6, Wheel = 3.2, Seats = 2 },
	Van = { W = 7, L = 14, BodyH = 2.6, Clear = 1.1, CabinL = 11, CabinZ = 1.2, CabinH = 3.6, Wheel = 2.7, Seats = 4 },
	Sports = { W = 6.6, L = 13, BodyH = 1.6, Clear = 0.8, CabinL = 5, CabinZ = 1, CabinH = 1.8, Wheel = 2.6, Seats = 2 },
	Super = { W = 7, L = 14, BodyH = 1.4, Clear = 0.7, CabinL = 4.6, CabinZ = 0.6, CabinH = 1.6, Wheel = 2.6, Seats = 2 },
}

local BIKE_STYLES = {
	Scooter = { W = 1.6, L = 5.5, Wheel = 2.0, FrameH = 1.6 },
	Motorbike = { W = 1.8, L = 7, Wheel = 2.6, FrameH = 1.6 },
	Dirtbike = { W = 1.5, L = 7, Wheel = 3.0, FrameH = 2.2 },
}

local function addWheel(model: Model, pos: Vector3, diameter: number, width: number, colliderX: number, visible: boolean?)
	if visible ~= false then
		Build.New("Part", {
			Name = "Wheel",
			Shape = Enum.PartType.Cylinder,
			Size = Vector3.new(width, diameter, diameter),
			CFrame = CFrame.new(pos),
			Color = BLACK,
			CanCollide = false,
			Parent = model,
		})
		Build.New("Part", {
			Name = "Hubcap",
			Shape = Enum.PartType.Cylinder,
			Size = Vector3.new(width + 0.05, diameter * 0.55, diameter * 0.55),
			CFrame = CFrame.new(pos),
			Color = CHROME,
			Material = Enum.Material.Metal,
			CanCollide = false,
			Parent = model,
		})
	end
	-- Onzichtbare bal die over de weg rolt/glijdt (makkelijk over stoepranden)
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

local function headlights(model: Model, w: number, y: number, frontZ: number, backZ: number)
	for _, side in { -1, 1 } do
		local head = Build.Box(model, CFrame.new(side * (w / 2 - 1), y, frontZ - 0.05), Vector3.new(1.4, 0.6, 0.2), Color3.fromRGB(255, 250, 220), Enum.Material.Neon)
		head.CanCollide = false
		local spot = Instance.new("SpotLight")
		spot.Face = Enum.NormalId.Front
		spot.Range = 40
		spot.Angle = 60
		spot.Brightness = 2
		spot.Parent = head

		local tail = Build.Box(model, CFrame.new(side * (w / 2 - 1), y, backZ + 0.05), Vector3.new(1.4, 0.5, 0.2), Color3.fromRGB(220, 20, 20), Enum.Material.Neon)
		tail.CanCollide = false
	end
end

local function buildCar(model: Model, style: string, color: Color3): BasePart
	local s = CAR_STYLES[style]
	local bodyY = s.Clear + s.BodyH / 2
	local topY = s.Clear + s.BodyH

	local body = Build.Box(model, CFrame.new(0, bodyY, 0), Vector3.new(s.W, s.BodyH, s.L), color)
	body.Name = "Chassis"
	body.Reflectance = 0.08
	body.CustomPhysicalProperties = NO_FRICTION

	-- Bumpers
	Build.Box(model, CFrame.new(0, s.Clear + 0.4, -s.L / 2 - 0.2), Vector3.new(s.W, 0.7, 0.5), DARK)
	Build.Box(model, CFrame.new(0, s.Clear + 0.4, s.L / 2 + 0.2), Vector3.new(s.W, 0.7, 0.5), DARK)

	-- Cabine met ramen
	local cabinColor = (style == "Van") and color or WINDOW
	local cabin = Build.Box(model, CFrame.new(0, topY + s.CabinH / 2, s.CabinZ), Vector3.new(s.W - 0.6, s.CabinH, s.CabinL), cabinColor)
	if style ~= "Van" then
		cabin.Material = Enum.Material.Glass
		cabin.Transparency = 0.35
	end
	Build.Box(model, CFrame.new(0, topY + s.CabinH + 0.15, s.CabinZ), Vector3.new(s.W - 0.5, 0.3, s.CabinL - 0.3), color)

	if style == "Van" then
		-- voorruit en zijramen
		Build.Glass(model, CFrame.new(0, topY + s.CabinH * 0.55, s.CabinZ - s.CabinL / 2 - 0.05), Vector3.new(s.W - 1.2, s.CabinH * 0.6, 0.2))
		for _, side in { -1, 1 } do
			Build.Glass(model, CFrame.new(side * (s.W / 2 - 0.25), topY + s.CabinH * 0.55, s.CabinZ - 1), Vector3.new(0.2, s.CabinH * 0.5, s.CabinL * 0.7))
		end
	end

	if style == "Pickup" then
		-- laadbak
		local bedZ = s.CabinZ + s.CabinL / 2 + 0.2
		local bedL = s.L / 2 - bedZ
		for _, side in { -1, 1 } do
			Build.Box(model, CFrame.new(side * (s.W / 2 - 0.2), topY + 0.6, bedZ + bedL / 2), Vector3.new(0.4, 1.2, bedL), color)
		end
		Build.Box(model, CFrame.new(0, topY + 0.6, s.L / 2 - 0.2), Vector3.new(s.W, 1.2, 0.4), color)
	end

	if style == "Sports" or style == "Super" then
		-- spoiler
		Build.Box(model, CFrame.new(0, topY + 0.9, s.L / 2 - 0.8), Vector3.new(s.W - 0.4, 0.2, 1.2), BLACK)
		for _, side in { -1, 1 } do
			Build.Box(model, CFrame.new(side * (s.W / 2 - 1.2), topY + 0.45, s.L / 2 - 0.8), Vector3.new(0.3, 0.9, 0.5), BLACK)
		end
		-- racestreep
		Build.Box(model, CFrame.new(0, topY + 0.02, -s.L / 4), Vector3.new(1.2, 0.05, s.L / 2 - 1), Color3.fromRGB(245, 245, 245))
	end

	if style == "Taxi" then
		local sign = Build.Box(model, CFrame.new(0, topY + s.CabinH + 0.65, s.CabinZ), Vector3.new(2.6, 0.8, 1.2), Color3.fromRGB(255, 230, 60), Enum.Material.Neon)
		Build.Sign(sign, "TAXI", BLACK, Enum.NormalId.Front)
		Build.Sign(sign, "TAXI", BLACK, Enum.NormalId.Back)
	end

	if style == "Police" then
		-- witte deuren met blauwe streep + zwaailichten
		for _, side in { -1, 1 } do
			Build.Box(model, CFrame.new(side * (s.W / 2 + 0.02), bodyY, 0), Vector3.new(0.05, s.BodyH * 0.9, s.L * 0.45), Color3.fromRGB(240, 240, 240))
			Build.Box(model, CFrame.new(side * (s.W / 2 + 0.05), bodyY - 0.6, 0), Vector3.new(0.05, 0.4, s.L * 0.95), Color3.fromRGB(20, 60, 200))
			local label = Build.Box(model, CFrame.new(side * (s.W / 2 + 0.06), bodyY + 0.6, 0), Vector3.new(0.05, 0.7, 4), Color3.fromRGB(240, 240, 240))
			label.Transparency = 1
			Build.Sign(label, "POLITIE", Color3.fromRGB(20, 60, 200), side == 1 and Enum.NormalId.Right or Enum.NormalId.Left)
		end
		local y = topY + s.CabinH + 0.5
		local red = Build.Box(model, CFrame.new(-0.9, y, s.CabinZ), Vector3.new(1.6, 0.5, 0.9), Color3.fromRGB(255, 30, 30), Enum.Material.Neon)
		red.Name = "SirenRed"
		Build.Light(red, Color3.fromRGB(255, 30, 30), 18, 3)
		local blue = Build.Box(model, CFrame.new(0.9, y, s.CabinZ), Vector3.new(1.6, 0.5, 0.9), Color3.fromRGB(30, 80, 255), Enum.Material.Neon)
		blue.Name = "SirenBlue"
		Build.Light(blue, Color3.fromRGB(30, 80, 255), 18, 3)
	end

	headlights(model, s.W, bodyY + 0.3, -s.L / 2, s.L / 2)

	-- Wielen
	local r = s.Wheel / 2
	for _, x in { -1, 1 } do
		for _, z in { -1, 1 } do
			addWheel(model, Vector3.new(x * (s.W / 2 - 0.3), r, z * (s.L / 2 - 2.4)), s.Wheel, 1.2, x * (s.W / 2 - 1.4))
		end
	end

	-- Stoelen (bestuurder links, zoals in Nederland)
	local seatY = s.Clear + s.BodyH * 0.5
	local frontSeatZ = s.CabinZ - s.CabinL / 4
	addSeat(model, Vector3.new(-s.W / 4, seatY, frontSeatZ), true)
	addSeat(model, Vector3.new(s.W / 4, seatY, frontSeatZ), false)
	if s.Seats >= 4 then
		local backSeatZ = s.CabinZ + s.CabinL / 4
		addSeat(model, Vector3.new(-s.W / 4, seatY, backSeatZ), false)
		addSeat(model, Vector3.new(s.W / 4, seatY, backSeatZ), false)
	end

	return body
end

local function buildBike(model: Model, style: string, color: Color3): BasePart
	local s = BIKE_STYLES[style]
	local r = s.Wheel / 2

	local frame = Build.Box(model, CFrame.new(0, r + 0.4, 0), Vector3.new(s.W, 1.2, s.L * 0.6), color)
	frame.Name = "Chassis"
	frame.Reflectance = 0.08
	frame.CustomPhysicalProperties = NO_FRICTION

	-- benzinetank / scooterbak
	Build.Box(model, CFrame.new(0, r + 1.2, -s.L * 0.12), Vector3.new(s.W + 0.2, 0.9, s.L * 0.25), color)
	-- stuur
	Build.Box(model, CFrame.new(0, r + s.FrameH, -s.L / 2 + r + 0.3), Vector3.new(0.3, s.FrameH, 0.3), CHROME, Enum.Material.Metal)
	Build.Box(model, CFrame.new(0, r + s.FrameH * 1.5, -s.L / 2 + r + 0.3), Vector3.new(3, 0.25, 0.25), BLACK)
	-- koplamp
	local head = Build.Box(model, CFrame.new(0, r + s.FrameH * 1.2, -s.L / 2 + r - 0.1), Vector3.new(0.8, 0.6, 0.3), Color3.fromRGB(255, 250, 220), Enum.Material.Neon)
	head.CanCollide = false
	local spot = Instance.new("SpotLight")
	spot.Face = Enum.NormalId.Front
	spot.Range = 35
	spot.Brightness = 2
	spot.Parent = head
	local tail = Build.Box(model, CFrame.new(0, r + 1, s.L * 0.3 + 0.05), Vector3.new(0.7, 0.4, 0.2), Color3.fromRGB(220, 20, 20), Enum.Material.Neon)
	tail.CanCollide = false

	if style == "Dirtbike" then
		Build.Box(model, CFrame.new(0, r * 2 + 0.2, -s.L / 2 + r), Vector3.new(1, 0.2, 1.6), color) -- spatbord
	end

	-- 2 zichtbare wielen, 4 onzichtbare ballen voor stabiliteit
	for _, z in { -1, 1 } do
		local pos = Vector3.new(0, r, z * (s.L / 2 - r))
		addWheel(model, pos, s.Wheel, 0.6, -0.9)
		addWheel(model, pos, s.Wheel, 0.6, 0.9, false)
	end

	addSeat(model, Vector3.new(0, r + 1.0, s.L * 0.08), true)
	if style ~= "Dirtbike" then
		addSeat(model, Vector3.new(0, r + 1.0, s.L * 0.08 + 1.8), false)
	end
	return frame
end

-- Bouw een voertuig. anchored = true voor showroom-modellen die stil staan.
function VehicleBuilder.Build(def: any, color: Color3, cf: CFrame, anchored: boolean?): Model
	local model = Instance.new("Model")
	model.Name = def.Name

	local bodyColor = color
	if def.Style == "Police" then
		bodyColor = Color3.fromRGB(20, 25, 40)
	elseif def.Style == "Taxi" then
		bodyColor = Color3.fromRGB(250, 200, 20)
	end

	local root: BasePart
	if BIKE_STYLES[def.Style] then
		root = buildBike(model, def.Style, bodyColor)
	else
		root = buildCar(model, def.Style, bodyColor)
	end
	model.PrimaryPart = root

	-- Alles vastlassen aan het chassis
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
