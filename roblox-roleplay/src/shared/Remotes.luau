-- Remotes: de "telefoonlijnen" tussen server en spelers.
-- De server maakt ze aan, de client wacht tot ze er zijn.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local EVENTS = {
	"SpawnVehicle", -- client -> server (vehicleId, colorName)
	"DespawnVehicle", -- client -> server
	"SetRole", -- client -> server (roleId)
	"ClaimHouse", -- client -> server (houseId)
	"LeaveHouse", -- client -> server
	"ToggleLock", -- client -> server
	"GoToHouse", -- client -> server (houseId)
	"Arrest", -- client -> server (targetPlayer)
	"OrderFood", -- client -> server (foodId)
	"Notify", -- server -> client (tekst)
	"HousesChanged", -- server -> client (lijst met huizen)
	"PassesChanged", -- server -> client (gamepasses in bezit)
	"OpenMenu", -- server -> client (menunaam)
}

local FUNCTIONS = {
	"GetState", -- client -> server, geeft gamepasses en huizen terug
}

local folder: Folder
if RunService:IsServer() then
	folder = Instance.new("Folder")
	folder.Name = "Remotes"
	for _, name in EVENTS do
		local remote = Instance.new("RemoteEvent")
		remote.Name = name
		remote.Parent = folder
	end
	for _, name in FUNCTIONS do
		local remote = Instance.new("RemoteFunction")
		remote.Name = name
		remote.Parent = folder
	end
	folder.Parent = ReplicatedStorage
else
	folder = ReplicatedStorage:WaitForChild("Remotes") :: Folder
end

local Remotes = {}

function Remotes.Event(name: string): RemoteEvent
	return folder:WaitForChild(name) :: RemoteEvent
end

function Remotes.Function(name: string): RemoteFunction
	return folder:WaitForChild(name) :: RemoteFunction
end

return Remotes
