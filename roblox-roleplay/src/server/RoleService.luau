-- RoleService: rollen/teams (Burger, Politie, ...), naambordjes en hoedjes.

local Players = game:GetService("Players")
local Teams = game:GetService("Teams")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = require(Shared.Config)
local Remotes = require(Shared.Remotes)

local RoleService = {}

local teamsById: { [string]: Team } = {}
local Monetization: any

local HATS = {
	Politie = { Color = Color3.fromRGB(20, 30, 70), Size = Vector3.new(1.5, 0.45, 1.5), Shape = Enum.PartType.Cylinder },
	Snackbar = { Color = Color3.fromRGB(250, 250, 250), Size = Vector3.new(1.0, 1.1, 1.1), Shape = Enum.PartType.Cylinder },
	Boef = { Color = Color3.fromRGB(20, 20, 20), Size = Vector3.new(1.4, 1.4, 1.4), Shape = Enum.PartType.Ball },
}

function RoleService.GetRole(player: Player): string
	return player:GetAttribute("Role") or "Burger"
end

local function updateHat(player: Player)
	local character = player.Character
	local head = character and character:FindFirstChild("Head") :: BasePart?
	if not head then
		return
	end
	local old = character:FindFirstChild("RoleHat")
	if old then
		old:Destroy()
	end
	local hat = HATS[RoleService.GetRole(player)]
	if not hat then
		return
	end
	local part = Instance.new("Part")
	part.Name = "RoleHat"
	part.Shape = hat.Shape
	part.Color = hat.Color
	part.Massless = true
	part.CanCollide = false
	part.CanQuery = false
	part.TopSurface = Enum.SurfaceType.Smooth
	part.BottomSurface = Enum.SurfaceType.Smooth
	if hat.Shape == Enum.PartType.Cylinder then
		-- staande cilinder: X-as omhoog draaien
		part.Size = Vector3.new(hat.Size.Y, hat.Size.X, hat.Size.Z)
		part.CFrame = head.CFrame * CFrame.new(0, head.Size.Y / 2 + hat.Size.Y / 2, 0) * CFrame.Angles(0, 0, math.pi / 2)
	else
		part.Size = hat.Size
		part.CFrame = head.CFrame * CFrame.new(0, head.Size.Y / 2 - 0.2, 0)
	end
	local weld = Instance.new("WeldConstraint")
	weld.Part0 = head
	weld.Part1 = part
	weld.Parent = part
	part.Parent = character
end

function RoleService.UpdateNametag(player: Player)
	local character = player.Character
	local head = character and character:FindFirstChild("Head")
	if not head then
		return
	end
	local humanoid = character:FindFirstChildOfClass("Humanoid")
	if humanoid then
		humanoid.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.None
	end

	local gui = head:FindFirstChild("Nametag") :: BillboardGui?
	if not gui then
		local newGui = Instance.new("BillboardGui")
		newGui.Name = "Nametag"
		newGui.Size = UDim2.fromOffset(220, 54)
		newGui.StudsOffset = Vector3.new(0, 2.6, 0)
		newGui.MaxDistance = 70

		local nameLabel = Instance.new("TextLabel")
		nameLabel.Name = "PlayerName"
		nameLabel.Size = UDim2.fromScale(1, 0.55)
		nameLabel.BackgroundTransparency = 1
		nameLabel.Font = Enum.Font.FredokaOne
		nameLabel.TextScaled = true
		nameLabel.TextStrokeTransparency = 0.4
		nameLabel.Parent = newGui

		local roleLabel = Instance.new("TextLabel")
		roleLabel.Name = "RoleName"
		roleLabel.Position = UDim2.fromScale(0, 0.55)
		roleLabel.Size = UDim2.fromScale(1, 0.45)
		roleLabel.BackgroundTransparency = 1
		roleLabel.Font = Enum.Font.GothamBold
		roleLabel.TextScaled = true
		roleLabel.TextStrokeTransparency = 0.4
		roleLabel.Parent = newGui

		newGui.Parent = head
		gui = newGui
	end
	assert(gui)

	local premium = Monetization.Owns(player, "Premium")
	local nameLabel = gui:FindFirstChild("PlayerName") :: TextLabel
	nameLabel.Text = (premium and "👑 " or "") .. player.DisplayName
	nameLabel.TextColor3 = premium and Color3.fromRGB(255, 210, 60) or Color3.new(1, 1, 1)

	local role = Config.GetRole(RoleService.GetRole(player))
	local roleLabel = gui:FindFirstChild("RoleName") :: TextLabel
	roleLabel.Text = role and role.Name or ""
	roleLabel.TextColor3 = player.TeamColor.Color
	if RoleService.GetRole(player) == "Boef" then
		roleLabel.TextColor3 = Color3.fromRGB(255, 80, 80)
	end
end

function RoleService.SetRole(player: Player, roleId: string)
	local role = Config.GetRole(roleId)
	if not role then
		return
	end
	player:SetAttribute("Role", role.Id)
	player.Team = teamsById[role.Id]
	updateHat(player)
	RoleService.UpdateNametag(player)
end

function RoleService.Init(monetization: any)
	Monetization = monetization

	for _, role in Config.Roles do
		local team = Instance.new("Team")
		team.Name = role.Name
		team.TeamColor = BrickColor.new(role.TeamColor)
		team.AutoAssignable = role.Id == "Burger"
		team.Parent = Teams
		teamsById[role.Id] = team
	end

	local function onPlayer(player: Player)
		player:SetAttribute("Role", "Burger")
		player.Team = teamsById.Burger
		player.CharacterAdded:Connect(function(character)
			character:WaitForChild("Head")
			updateHat(player)
			RoleService.UpdateNametag(player)
		end)
	end
	Players.PlayerAdded:Connect(onPlayer)
	for _, player in Players:GetPlayers() do
		onPlayer(player)
	end

	Monetization.Changed.Event:Connect(function(player)
		RoleService.UpdateNametag(player)
	end)

	Remotes.Event("SetRole").OnServerEvent:Connect(function(player, roleId)
		if typeof(roleId) ~= "string" or not Config.GetRole(roleId) then
			return
		end
		if player:GetAttribute("JailedUntil") then
			Remotes.Event("Notify"):FireClient(player, "Je zit in de cel! Wacht tot je vrij bent.")
			return
		end
		RoleService.SetRole(player, roleId)
		Remotes.Event("Notify"):FireClient(player, "Je bent nu: " .. Config.GetRole(roleId).Name)
	end)
end

return RoleService
