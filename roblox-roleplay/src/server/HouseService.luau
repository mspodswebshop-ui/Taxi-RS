-- HouseService: huizen claimen, deuren op slot doen en naar je huis teleporteren.
-- Claimen en op slot doen gaat met F bij de deurbel naast de voordeur, of via het menu.
-- Villa's (Premium = true) kun je alleen claimen met de Premium-gamepass.

local Players = game:GetService("Players")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Remotes = require(Shared.Remotes)
local Doors = require(script.Parent.Doors)

local HouseService = {}

local houses: { any } = {}
local byId: { [string]: any } = {}
local owners: { [string]: Player } = {}
local playerHouse: { [Player]: string } = {}
local monetization: any

local GREEN = Color3.fromRGB(40, 220, 80)
local RED = Color3.fromRGB(230, 40, 40)

local function notify(player: Player, text: string)
	Remotes.Event("Notify"):FireClient(player, text)
end

function HouseService.Snapshot()
	local list = {}
	for _, house in houses do
		local owner = owners[house.Id]
		table.insert(list, {
			Id = house.Id,
			Name = house.Name,
			Premium = house.Premium,
			Owner = owner and owner.DisplayName or nil,
			OwnerUserId = owner and owner.UserId or nil,
			Locked = house.Locked == true,
		})
	end
	return list
end

local function broadcast()
	Remotes.Event("HousesChanged"):FireAllClients(HouseService.Snapshot())
end

local function setLocked(house: any, locked: boolean)
	house.Locked = locked
	for _, door in house.Doors do
		Doors.SetLocked(door, locked)
	end
	house.LockLight.Color = locked and RED or GREEN
end

local function refresh(house: any)
	local owner = owners[house.Id]
	for _, door in house.Doors do
		Doors.SetOwner(door, owner and owner.UserId or 0)
	end
	if owner then
		house.Sign.Text = owner.DisplayName
		house.Prompt.ActionText = "Op slot / open"
		house.Prompt.ObjectText = house.Name
	else
		house.Sign.Text = house.Premium and "👑 Te koop" or "Te koop"
		house.Prompt.ActionText = "Claim huis"
		house.Prompt.ObjectText = house.Name .. (house.Premium and " (Premium)" or "")
	end
end

function HouseService.Release(player: Player)
	local id = playerHouse[player]
	if not id then
		return
	end
	playerHouse[player] = nil
	owners[id] = nil
	local house = byId[id]
	setLocked(house, false)
	refresh(house)
	broadcast()
end

function HouseService.Claim(player: Player, id: string)
	local house = byId[id]
	if not house then
		return
	end
	if owners[id] then
		if owners[id] ~= player then
			notify(player, "Dit huis is al van " .. owners[id].DisplayName)
		end
		return
	end
	if house.Premium and not monetization.Owns(player, "Premium") then
		notify(player, "Villa's zijn alleen voor Premium 👑. Koop Premium in de winkel!")
		return
	end
	HouseService.Release(player)
	owners[id] = player
	playerHouse[player] = id
	setLocked(house, false)
	refresh(house)
	broadcast()
	notify(player, "Welkom thuis! " .. house.Name .. " is nu van jou. 🏠")
end

function HouseService.ToggleLock(player: Player)
	local id = playerHouse[player]
	if not id then
		notify(player, "Je hebt nog geen huis.")
		return
	end
	local house = byId[id]
	local locked = not house.Locked
	setLocked(house, locked)
	broadcast()
	notify(player, locked and "Alle deuren op slot 🔒" or "Deuren van het slot 🔓")
end

function HouseService.GoTo(player: Player, id: string)
	local house = byId[id]
	local character = player.Character
	if not house or not character or player:GetAttribute("JailedUntil") then
		return
	end
	local humanoid = character:FindFirstChildOfClass("Humanoid")
	if humanoid and humanoid.SeatPart then
		humanoid.Sit = false
		task.wait()
	end
	character:PivotTo(house.Entrance + Vector3.new(0, 3, 0))
end

function HouseService.Init(houseList: { any }, money: any)
	houses = houseList
	monetization = money

	for _, house in houses do
		byId[house.Id] = house
		setLocked(house, false)
		refresh(house)
		house.Prompt.Triggered:Connect(function(player)
			local owner = owners[house.Id]
			if owner == player then
				HouseService.ToggleLock(player)
			elseif owner == nil then
				HouseService.Claim(player, house.Id)
			else
				notify(player, "Dit is het huis van " .. owner.DisplayName)
			end
		end)
	end

	Remotes.Event("ClaimHouse").OnServerEvent:Connect(function(player, id)
		if typeof(id) == "string" then
			HouseService.Claim(player, id)
		end
	end)
	Remotes.Event("GoToHouse").OnServerEvent:Connect(function(player, id)
		if typeof(id) == "string" then
			HouseService.GoTo(player, id)
		end
	end)
	Remotes.Event("LeaveHouse").OnServerEvent:Connect(function(player)
		if playerHouse[player] then
			HouseService.Release(player)
			notify(player, "Je bent verhuisd. Je hebt nu geen huis meer.")
		end
	end)
	Remotes.Event("ToggleLock").OnServerEvent:Connect(HouseService.ToggleLock)

	Players.PlayerRemoving:Connect(HouseService.Release)
end

return HouseService
