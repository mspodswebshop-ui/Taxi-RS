-- BankService: boeven kunnen de kluis van de bank kraken.
-- Dan gaat het alarm af, krijgt de politie een melding en is de boef "gezocht"
-- totdat de politie de boef arresteert.

local Players = game:GetService("Players")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = require(Shared.Config)
local Remotes = require(Shared.Remotes)
local Build = require(script.Parent.Build)
local Doors = require(script.Parent.Doors)

local BankService = {}

local function notify(player: Player, text: string)
	Remotes.Event("Notify"):FireClient(player, text)
end

local function giveMoneyBag(player: Player)
	local backpack = player:FindFirstChildOfClass("Backpack")
	if not backpack then
		return
	end
	if backpack:FindFirstChild("Geldzak") or (player.Character and player.Character:FindFirstChild("Geldzak")) then
		return
	end
	local tool = Instance.new("Tool")
	tool.Name = "Geldzak"
	tool.CanBeDropped = false
	tool.ToolTip = "Gestolen geld!"
	local handle = Instance.new("Part")
	handle.Name = "Handle"
	handle.Size = Vector3.new(1.4, 1.6, 1.4)
	handle.Color = Color3.fromRGB(70, 150, 70)
	handle.Material = Enum.Material.Fabric
	handle.CanCollide = false
	handle.Parent = tool
	local label = Build.Sign(handle, "€", Color3.new(1, 1, 1), Enum.NormalId.Front)
	label.Font = Enum.Font.GothamBlack
	tool.Parent = backpack
end

function BankService.Init(world: any, roleService: any)
	local bank = world.Bank
	if not bank then
		return
	end

	local nextAllowed = 0
	local alarmOn = false

	local keypadPrompt = Build.Prompt(bank.Keypad, "Kluis kraken", "Bank", 8)
	keypadPrompt.HoldDuration = Config.RobberyTime
	local cashPrompt = Build.Prompt(bank.Cash, "Pak het geld", "Kluis", 8)
	cashPrompt.HoldDuration = 2
	cashPrompt.Enabled = false

	local function setAlarm(on: boolean)
		alarmOn = on
		if not on then
			for _, lamp in bank.Alarms do
				lamp.Material = Enum.Material.SmoothPlastic
				local light = lamp:FindFirstChildOfClass("PointLight")
				if light then
					light.Enabled = false
				end
			end
			return
		end
		task.spawn(function()
			local flash = false
			while alarmOn do
				flash = not flash
				for _, lamp in bank.Alarms do
					lamp.Material = flash and Enum.Material.Neon or Enum.Material.SmoothPlastic
					lamp.Color = flash and Color3.fromRGB(255, 30, 30) or Color3.fromRGB(120, 20, 20)
					local light = lamp:FindFirstChildOfClass("PointLight")
					if light then
						light.Enabled = flash
					end
				end
				task.wait(0.4)
			end
		end)
	end

	keypadPrompt.Triggered:Connect(function(player)
		if roleService.GetRole(player) ~= "Boef" then
			notify(player, "Alleen boeven kunnen de bank overvallen 😉 Kies de rol Boef.")
			return
		end
		if os.time() < nextAllowed then
			notify(player, "De kluis is net leeggehaald. Probeer het over " .. (nextAllowed - os.time()) .. " seconden.")
			return
		end
		nextAllowed = os.time() + Config.RobberyCooldown
		Doors.SetOpen(bank.VaultDoor, true)
		cashPrompt.Enabled = true
		setAlarm(true)
		notify(player, "De kluis is open! Pak het geld en vlucht! 💰")
		for _, other in Players:GetPlayers() do
			if roleService.GetRole(other) == "Politie" then
				notify(other, "🚨 ALARM: de bank wordt overvallen!")
			end
		end
		task.delay(60, function()
			Doors.SetOpen(bank.VaultDoor, false)
			cashPrompt.Enabled = false
			setAlarm(false)
		end)
	end)

	cashPrompt.Triggered:Connect(function(player)
		if roleService.GetRole(player) ~= "Boef" then
			return
		end
		giveMoneyBag(player)
		player:SetAttribute("Wanted", true)
		notify(player, "Je hebt het geld! Je bent nu GEZOCHT 🚨")
	end)
end

return BankService
