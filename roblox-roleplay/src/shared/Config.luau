--[[
	Config: alle instellingen van Zonnestad op één plek.

	GAMEPASSES INSTELLEN
	1. Publiceer je spel (File > Publish to Roblox).
	2. Ga naar create.roblox.com > jouw spel > Monetization > Passes.
	3. Maak per gamepass hieronder een pass aan en zet de prijs in Robux.
	4. Kopieer het ID van de pass en vul het hieronder in bij Id.

	Zolang een Id op 0 staat, krijg je die gamepass GRATIS in Roblox Studio,
	zodat je alles kunt testen. In het echte spel is hij dan niet te koop.
]]

local Config = {}

Config.TownName = "Zonnestad"

Config.GamePasses = {
	Premium = {
		Id = 0,
		Name = "Premium",
		Description = "Luxe villa's met zwembad en een gouden naambordje",
		Price = 199,
		Icon = "👑",
	},
	Sportwagens = {
		Id = 0,
		Name = "Sportwagens",
		Description = "Rij in de Sportwagen en de supersnelle Supercar",
		Price = 149,
		Icon = "🏎️",
	},
	Motoren = {
		Id = 0,
		Name = "Motoren",
		Description = "Snelle motoren: de Racemotor en de Crossmotor",
		Price = 99,
		Icon = "🏍️",
	},
}

-- Volgorde waarin de gamepasses in de winkel staan
Config.GamePassOrder = { "Premium", "Sportwagens", "Motoren" }

-- Voertuigen. Style bepaalt hoe het voertuig eruitziet (zie VehicleBuilder).
-- GamePass = welke gamepass nodig is. Role = alleen voor die rol.
Config.Vehicles = {
	{ Id = "Gezinsauto", Name = "Gezinsauto", Style = "Sedan", MaxSpeed = 60 },
	{ Id = "Pickup", Name = "Pick-up", Style = "Pickup", MaxSpeed = 55 },
	{ Id = "Busje", Name = "Busje", Style = "Van", MaxSpeed = 50 },
	{ Id = "Taxi", Name = "Taxi", Style = "Taxi", MaxSpeed = 65 },
	{ Id = "Scooter", Name = "Scooter", Style = "Scooter", MaxSpeed = 45 },
	{ Id = "Politieauto", Name = "Politieauto", Style = "Police", MaxSpeed = 85, Role = "Politie" },
	{ Id = "Sportwagen", Name = "Sportwagen", Style = "Sports", MaxSpeed = 100, GamePass = "Sportwagens" },
	{ Id = "Supercar", Name = "Supercar", Style = "Super", MaxSpeed = 125, GamePass = "Sportwagens" },
	{ Id = "Racemotor", Name = "Racemotor", Style = "Motorbike", MaxSpeed = 110, GamePass = "Motoren" },
	{ Id = "Crossmotor", Name = "Crossmotor", Style = "Dirtbike", MaxSpeed = 85, GamePass = "Motoren" },
}

Config.VehicleColors = {
	{ Name = "Rood", Color = Color3.fromRGB(200, 30, 40) },
	{ Name = "Blauw", Color = Color3.fromRGB(30, 90, 200) },
	{ Name = "Zwart", Color = Color3.fromRGB(25, 25, 30) },
	{ Name = "Wit", Color = Color3.fromRGB(235, 235, 235) },
	{ Name = "Groen", Color = Color3.fromRGB(40, 150, 70) },
	{ Name = "Geel", Color = Color3.fromRGB(240, 200, 30) },
	{ Name = "Roze", Color = Color3.fromRGB(240, 110, 180) },
	{ Name = "Paars", Color = Color3.fromRGB(120, 60, 190) },
}

-- Rollen (teams). TeamColor moet een geldige BrickColor-naam zijn.
Config.Roles = {
	{ Id = "Burger", Name = "Burger", TeamColor = "Medium stone grey", Description = "Gewone inwoner van de stad" },
	{ Id = "Politie", Name = "Politie", TeamColor = "Bright blue", Description = "Rij in de politieauto en arresteer boeven" },
	{ Id = "Snackbar", Name = "Snackbar-medewerker", TeamColor = "Bright orange", Description = "Bak friet en burgers in de snackbar" },
	{ Id = "Kantoor", Name = "Kantoorbaan", TeamColor = "Dark green", Description = "Werk in de kantoortoren" },
	{ Id = "Boef", Name = "Boef", TeamColor = "Really black", Description = "Ontloop de politie... als je kunt!" },
}

-- Eten uit de snackbar (gratis)
Config.Food = {
	{ Id = "Friet", Name = "Friet", Color = Color3.fromRGB(245, 200, 60) },
	{ Id = "Burger", Name = "Burger", Color = Color3.fromRGB(150, 90, 40) },
	{ Id = "Frikandel", Name = "Frikandel", Color = Color3.fromRGB(110, 50, 30) },
	{ Id = "Cola", Name = "Cola", Color = Color3.fromRGB(180, 20, 30) },
	{ Id = "Ijsje", Name = "IJsje", Color = Color3.fromRGB(255, 190, 220) },
}

Config.JailTime = 45 -- seconden in de cel
Config.ArrestDistance = 12

function Config.GetVehicle(id: string)
	for _, v in Config.Vehicles do
		if v.Id == id then
			return v
		end
	end
	return nil
end

function Config.GetRole(id: string)
	for _, r in Config.Roles do
		if r.Id == id then
			return r
		end
	end
	return nil
end

function Config.GetColor(name: string?)
	for _, c in Config.VehicleColors do
		if c.Name == name then
			return c.Color
		end
	end
	return Config.VehicleColors[1].Color
end

return Config
