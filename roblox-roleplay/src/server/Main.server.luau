-- Main: start de hele stad op.

local Lighting = game:GetService("Lighting")
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = require(Shared.Config)
local Remotes = require(Shared.Remotes)

local WorldBuilder = require(script.Parent.WorldBuilder)
local Monetization = require(script.Parent.Monetization)
local RoleService = require(script.Parent.RoleService)
local VehicleService = require(script.Parent.VehicleService)
local HouseService = require(script.Parent.HouseService)
local PoliceService = require(script.Parent.PoliceService)
local FoodService = require(script.Parent.FoodService)
local BankService = require(script.Parent.BankService)
local Doors = require(script.Parent.Doors)

-- Spelers pas laten verschijnen als de stad klaar is
Players.CharacterAutoLoads = false

-- Licht en sfeer (zo ziet het er echter uit)
Lighting.ClockTime = 10
Lighting.Brightness = 3
Lighting.OutdoorAmbient = Color3.fromRGB(128, 128, 140)
Lighting.Ambient = Color3.fromRGB(70, 70, 80)
Lighting.GlobalShadows = true
Lighting.ShadowSoftness = 0.25
Lighting.EnvironmentDiffuseScale = 1
Lighting.EnvironmentSpecularScale = 1
Lighting.GeographicLatitude = 41

local atmosphere = Instance.new("Atmosphere")
atmosphere.Density = 0.3
atmosphere.Offset = 0.25
atmosphere.Color = Color3.fromRGB(199, 215, 235)
atmosphere.Decay = Color3.fromRGB(106, 120, 140)
atmosphere.Glare = 0.3
atmosphere.Haze = 1.2
atmosphere.Parent = Lighting

local color = Instance.new("ColorCorrectionEffect")
color.Brightness = 0.02
color.Contrast = 0.08
color.Saturation = 0.15
color.TintColor = Color3.fromRGB(255, 250, 242)
color.Parent = Lighting

local bloom = Instance.new("BloomEffect")
bloom.Intensity = 0.6
bloom.Size = 24
bloom.Threshold = 1.6
bloom.Parent = Lighting

local sunRays = Instance.new("SunRaysEffect")
sunRays.Intensity = 0.08
sunRays.Spread = 0.6
sunRays.Parent = Lighting

Doors.SetNotifier(function(player, text)
	Remotes.Event("Notify"):FireClient(player, text)
end)

local world = WorldBuilder.Build()

local terrain = workspace:FindFirstChildOfClass("Terrain")
if terrain then
	local clouds = Instance.new("Clouds")
	clouds.Cover = 0.55
	clouds.Density = 0.6
	clouds.Parent = terrain
end

Monetization.Init()
RoleService.Init(Monetization)
VehicleService.Init(world, RoleService, Monetization)
HouseService.Init(world.Houses, Monetization)
PoliceService.Init(RoleService, world, VehicleService)
FoodService.Init(world)
BankService.Init(world, RoleService)

-- Knoppen in de wereld die een menu openen (garage, snackbar)
for _, item in world.MenuPrompts do
	item.Prompt.Triggered:Connect(function(player)
		Remotes.Event("OpenMenu"):FireClient(player, item.Menu)
	end)
end

-- Knoppen in de wereld die je een baan geven
for _, item in world.RolePrompts do
	item.Prompt.Triggered:Connect(function(player)
		if player:GetAttribute("JailedUntil") then
			Remotes.Event("Notify"):FireClient(player, "Je zit in de cel!")
			return
		end
		RoleService.SetRole(player, item.Role)
		Remotes.Event("Notify"):FireClient(player, "Je bent nu: " .. Config.GetRole(item.Role).Name)
	end)
end

Remotes.Function("GetState").OnServerInvoke = function(player)
	return {
		Passes = Monetization.GetOwned(player),
		Houses = HouseService.Snapshot(),
	}
end

-- Spelers laden en laten respawnen
local function setupPlayer(player: Player)
	player.CharacterAdded:Connect(function(character)
		local humanoid = character:WaitForChild("Humanoid") :: Humanoid
		humanoid.Died:Connect(function()
			task.wait(Players.RespawnTime)
			if player.Parent then
				player:LoadCharacter()
			end
		end)
	end)
	player:LoadCharacter()
end
Players.PlayerAdded:Connect(setupPlayer)
for _, player in Players:GetPlayers() do
	task.spawn(setupPlayer, player)
end

-- Dag en nacht (een hele dag duurt 12 minuten)
local DAY_LENGTH = 12 * 60
local wasNight = nil
RunService.Heartbeat:Connect(function(dt)
	Lighting.ClockTime = (Lighting.ClockTime + dt * 24 / DAY_LENGTH) % 24
	local night = Lighting.ClockTime >= 18 or Lighting.ClockTime < 6.5
	if night ~= wasNight then
		wasNight = night
		for _, lamp in world.StreetLamps do
			lamp.Material = night and Enum.Material.Neon or Enum.Material.SmoothPlastic
			local light = lamp:FindFirstChildWhichIsA("Light")
			if light then
				light.Enabled = night
			end
		end
	end
end)

print(Config.TownName .. " is klaar! 🌞")
