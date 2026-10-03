--[[
	Config: alle instellingen van Zonnestad op één plek.

	GAMEPASSES INSTELLEN
	1. Publiceer je spel (File > Publish to Roblox).
	2. Ga naar create.roblox.com > jouw spel > Monetization > Passes.
	3. Maak per gamepass hieronder een pass aan en zet de prijs in Robux.
	4. Kopieer het ID van de pass en vul het hieronder in bij Id.

	Zolang een Id op 0 staat, is die gamepass nog niet te koop en heeft niemand hem.
	Wil je in Roblox Studio alles gratis testen? Zet dan GratisInStudio op true.
	(Dit werkt alleen in Studio, nooit in het echte spel.)
]]

local Config = {}

Config.GratisInStudio = false

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
	{ Id = "Schoolbus", Name = "Schoolbus", Style = "Bus", MaxSpeed = 45 },
	{ Id = "Scooter", Name = "Scooter", Style = "Scooter", MaxSpeed = 45 },
	{ Id = "Politieauto", Name = "Politieauto", Style = "Police", MaxSpeed = 85, Role = "Politie" },
	{ Id = "Ambulance", Name = "Ambulance", Style = "Ambulance", MaxSpeed = 80, Role = "Dokter" },
	{ Id = "Brandweerwagen", Name = "Brandweerwagen", Style = "FireTruck", MaxSpeed = 70, Role = "Brandweer" },
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
	{ Id = "Brandweer", Name = "Brandweer", TeamColor = "Bright red", Description = "Rij in de brandweerwagen" },
	{ Id = "Dokter", Name = "Dokter", TeamColor = "White", Description = "Werk in het ziekenhuis en rij ambulance" },
	{ Id = "Leraar", Name = "Leraar", TeamColor = "Bright violet", Description = "Geef les op school" },
	{ Id = "Leerling", Name = "Leerling", TeamColor = "Bright yellow", Description = "Ga naar school" },
	{ Id = "Snackbar", Name = "Snackbar-medewerker", TeamColor = "Bright orange", Description = "Bak friet en burgers in de snackbar" },
	{ Id = "Kantoor", Name = "Kantoorbaan", TeamColor = "Dark green", Description = "Werk in de kantoortoren" },
	{ Id = "Boef", Name = "Boef", TeamColor = "Really black", Description = "Overval de bank... en ontloop de politie!" },
}

-- Eten en spullen uit de winkels (gratis). Shop = waar je het haalt.
Config.Food = {
	{ Id = "Friet", Name = "Friet", Shop = "Snackbar", Color = Color3.fromRGB(245, 200, 60) },
	{ Id = "Burger", Name = "Burger", Shop = "Snackbar", Color = Color3.fromRGB(150, 90, 40) },
	{ Id = "Frikandel", Name = "Frikandel", Shop = "Snackbar", Color = Color3.fromRGB(110, 50, 30) },
	{ Id = "Cola", Name = "Cola", Shop = "Snackbar", Color = Color3.fromRGB(180, 20, 30) },
	{ Id = "Ijsje", Name = "IJsje", Shop = "Snackbar", Color = Color3.fromRGB(255, 190, 220) },
	{ Id = "Boodschappen", Name = "Boodschappentas", Shop = "Supermarkt", Color = Color3.fromRGB(40, 140, 70) },
	{ Id = "Brood", Name = "Brood", Shop = "Supermarkt", Color = Color3.fromRGB(205, 150, 80) },
	{ Id = "Melk", Name = "Melk", Shop = "Supermarkt", Color = Color3.fromRGB(245, 245, 245) },
	{ Id = "Appel", Name = "Appel", Shop = "Supermarkt", Color = Color3.fromRGB(200, 30, 40) },
	{ Id = "Chips", Name = "Chips", Shop = "Supermarkt", Color = Color3.fromRGB(240, 190, 30) },
}

Config.JailTime = 45 -- seconden in de cel
Config.RobberyTime = 6 -- seconden de knop vasthouden om de kluis te kraken
Config.RobberyCooldown = 180 -- seconden voordat de bank weer overvallen kan worden
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
