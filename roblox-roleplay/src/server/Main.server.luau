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

-- Spelers pas laten verschijnen als de stad klaar is
Players.CharacterAutoLoads = false

-- Licht en sfeer
Lighting.ClockTime = 9
Lighting.Brightness = 2.5
Lighting.OutdoorAmbient = Color3.fromRGB(140, 140, 150)
Lighting.Ambient = Color3.fromRGB(90, 90, 100)
Lighting.GlobalShadows = true
local atmosphere = Instance.new("Atmosphere")
atmosphere.Density = 0.28
atmosphere.Haze = 1
atmosphere.Parent = Lighting

local world = WorldBuilder.Build()

Monetization.Init()
RoleService.Init(Monetization)
VehicleService.Init(world, RoleService, Monetization)
HouseService.Init(world.Houses, Monetization)
PoliceService.Init(RoleService, world, VehicleService)
FoodService.Init(world)

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
			local light = lamp:FindFirstChildOfClass("PointLight")
			if light then
				light.Enabled = night
			end
		end
	end
end)

print(Config.TownName .. " is klaar! 🌞")
