-- Monetization: houdt bij welke gamepasses (Robux) elke speler heeft.

local MarketplaceService = game:GetService("MarketplaceService")
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = require(Shared.Config)
local Remotes = require(Shared.Remotes)

local Monetization = {}
Monetization.Changed = Instance.new("BindableEvent") -- (player)

local owned: { [Player]: { [string]: boolean } } = {}

local function keyForId(id: number): string?
	for key, pass in Config.GamePasses do
		if pass.Id ~= 0 and pass.Id == id then
			return key
		end
	end
	return nil
end

function Monetization.Owns(player: Player, key: string?): boolean
	if key == nil then
		return true
	end
	local pass = Config.GamePasses[key]
	if not pass then
		return false
	end
	if pass.Id == 0 then
		-- Nog geen echte gamepass ingesteld: gratis in Studio om te testen
		return RunService:IsStudio()
	end
	local list = owned[player]
	return list ~= nil and list[key] == true
end

function Monetization.GetOwned(player: Player): { [string]: boolean }
	local result = {}
	for key in Config.GamePasses do
		result[key] = Monetization.Owns(player, key)
	end
	return result
end

local function loadPlayer(player: Player)
	owned[player] = {}
	for key, pass in Config.GamePasses do
		if pass.Id ~= 0 then
			local ok, has = pcall(MarketplaceService.UserOwnsGamePassAsync, MarketplaceService, player.UserId, pass.Id)
			if ok and has and owned[player] then
				owned[player][key] = true
			end
		end
	end
	Remotes.Event("PassesChanged"):FireClient(player, Monetization.GetOwned(player))
	Monetization.Changed:Fire(player)
end

function Monetization.Init()
	Players.PlayerAdded:Connect(loadPlayer)
	for _, player in Players:GetPlayers() do
		task.spawn(loadPlayer, player)
	end
	Players.PlayerRemoving:Connect(function(player)
		owned[player] = nil
	end)

	MarketplaceService.PromptGamePassPurchaseFinished:Connect(function(player, passId, purchased)
		if not purchased then
			return
		end
		local key = keyForId(passId)
		if key and owned[player] then
			owned[player][key] = true
			Remotes.Event("PassesChanged"):FireClient(player, Monetization.GetOwned(player))
			Remotes.Event("Notify"):FireClient(player, "Bedankt! Je hebt nu " .. Config.GamePasses[key].Name .. " " .. Config.GamePasses[key].Icon)
			Monetization.Changed:Fire(player)
		end
	end)
end

return Monetization
