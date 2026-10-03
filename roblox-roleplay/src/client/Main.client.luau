-- Het menu op het scherm van de speler: voertuigen, huizen, banen, winkel en snackbar.

local MarketplaceService = game:GetService("MarketplaceService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Config = require(Shared.Config)
local Remotes = require(Shared.Remotes)

local player = Players.LocalPlayer

------------------------------------------------------------------------
-- Status
------------------------------------------------------------------------

local passes: { [string]: boolean } = {}
local houses: { any } = {}
local selectedColor = Config.VehicleColors[1].Name
local currentMenu: string? = nil
local prices: { [string]: number } = {}

------------------------------------------------------------------------
-- UI-hulpjes
------------------------------------------------------------------------

local COLORS = {
	Panel = Color3.fromRGB(28, 31, 40),
	Row = Color3.fromRGB(44, 48, 60),
	Text = Color3.fromRGB(245, 245, 250),
	Sub = Color3.fromRGB(170, 175, 190),
	Green = Color3.fromRGB(60, 185, 95),
	Blue = Color3.fromRGB(55, 120, 230),
	Red = Color3.fromRGB(215, 65, 65),
	Gold = Color3.fromRGB(240, 185, 40),
	Grey = Color3.fromRGB(95, 100, 115),
}

local function make(className: string, props: { [string]: any }, children: { Instance }?): any
	local inst = Instance.new(className)
	for key, value in props do
		if key ~= "Parent" then
			(inst :: any)[key] = value
		end
	end
	for _, child in children or {} do
		child.Parent = inst
	end
	inst.Parent = props.Parent
	return inst
end

local function corner(radius: number?): UICorner
	return make("UICorner", { CornerRadius = UDim.new(0, radius or 10) })
end

local function textButton(text: string, color: Color3, size: UDim2, onClick: (() -> ())?): TextButton
	local b = make("TextButton", {
		Text = text,
		Size = size,
		BackgroundColor3 = color,
		TextColor3 = Color3.new(1, 1, 1),
		Font = Enum.Font.GothamBold,
		TextScaled = true,
		AutoButtonColor = true,
	}, { corner(8), make("UIPadding", {
		PaddingLeft = UDim.new(0, 8),
		PaddingRight = UDim.new(0, 8),
		PaddingTop = UDim.new(0, 6),
		PaddingBottom = UDim.new(0, 6),
	}) })
	if onClick then
		b.Activated:Connect(onClick)
	end
	return b
end

local gui = make("ScreenGui", {
	Name = "ZonnestadUI",
	ResetOnSpawn = false,
	ZIndexBehavior = Enum.ZIndexBehavior.Sibling,
	Parent = player:WaitForChild("PlayerGui"),
})

------------------------------------------------------------------------
-- Meldingen bovenaan het scherm
------------------------------------------------------------------------

local toastHolder = make("Frame", {
	BackgroundTransparency = 1,
	AnchorPoint = Vector2.new(0.5, 0),
	Position = UDim2.new(0.5, 0, 0, 10),
	Size = UDim2.new(0.9, 0, 0, 200),
	Parent = gui,
}, {
	make("UIListLayout", { HorizontalAlignment = Enum.HorizontalAlignment.Center, Padding = UDim.new(0, 6) }),
})

local function toast(text: string)
	local label = make("TextLabel", {
		Text = text,
		Size = UDim2.new(0, 0, 0, 38),
		AutomaticSize = Enum.AutomaticSize.X,
		BackgroundColor3 = COLORS.Panel,
		BackgroundTransparency = 0.1,
		TextColor3 = COLORS.Text,
		Font = Enum.Font.GothamBold,
		TextSize = 18,
		Parent = toastHolder,
	}, { corner(10), make("UIPadding", { PaddingLeft = UDim.new(0, 14), PaddingRight = UDim.new(0, 14) }) })
	task.delay(3.5, function()
		local info = TweenInfo.new(0.4)
		TweenService:Create(label, info, { BackgroundTransparency = 1, TextTransparency = 1 }):Play()
		task.wait(0.45)
		label:Destroy()
	end)
end

------------------------------------------------------------------------
-- Paneel in het midden
------------------------------------------------------------------------

local panel = make("Frame", {
	Name = "Panel",
	AnchorPoint = Vector2.new(0.5, 0.5),
	Position = UDim2.fromScale(0.5, 0.52),
	Size = UDim2.fromScale(0.9, 0.75),
	BackgroundColor3 = COLORS.Panel,
	Visible = false,
	Parent = gui,
}, {
	corner(16),
	make("UISizeConstraint", { MaxSize = Vector2.new(480, 520) }),
	make("UIStroke", { Color = Color3.fromRGB(70, 75, 95), Thickness = 2 }),
})

local title = make("TextLabel", {
	Text = "",
	Position = UDim2.new(0, 16, 0, 10),
	Size = UDim2.new(1, -80, 0, 36),
	BackgroundTransparency = 1,
	TextColor3 = COLORS.Text,
	Font = Enum.Font.FredokaOne,
	TextScaled = true,
	TextXAlignment = Enum.TextXAlignment.Left,
	Parent = panel,
})

local closeButton = textButton("✕", COLORS.Red, UDim2.new(0, 40, 0, 40), nil)
closeButton.AnchorPoint = Vector2.new(1, 0)
closeButton.Position = UDim2.new(1, -10, 0, 8)
closeButton.Parent = panel

local content = make("ScrollingFrame", {
	Position = UDim2.new(0, 12, 0, 58),
	Size = UDim2.new(1, -24, 1, -70),
	BackgroundTransparency = 1,
	BorderSizePixel = 0,
	ScrollBarThickness = 6,
	CanvasSize = UDim2.new(),
	AutomaticCanvasSize = Enum.AutomaticSize.Y,
	Parent = panel,
}, {
	make("UIListLayout", { Padding = UDim.new(0, 8), SortOrder = Enum.SortOrder.LayoutOrder }),
})

local order = 0
local function clearContent()
	order = 0
	for _, child in content:GetChildren() do
		if not child:IsA("UIListLayout") then
			child:Destroy()
		end
	end
end

-- Een rij met titel, uitleg en 1 of 2 knoppen rechts
local function row(name: string, sub: string?, buttons: { TextButton })
	order += 1
	local frame = make("Frame", {
		LayoutOrder = order,
		Size = UDim2.new(1, -8, 0, 62),
		BackgroundColor3 = COLORS.Row,
		Parent = content,
	}, { corner(10) })
	local buttonWidth = #buttons * 110
	make("TextLabel", {
		Text = name,
		Position = UDim2.new(0, 12, 0, 6),
		Size = UDim2.new(1, -buttonWidth - 24, 0, 26),
		BackgroundTransparency = 1,
		TextColor3 = COLORS.Text,
		Font = Enum.Font.GothamBold,
		TextScaled = true,
		TextXAlignment = Enum.TextXAlignment.Left,
		Parent = frame,
	})
	if sub then
		make("TextLabel", {
			Text = sub,
			Position = UDim2.new(0, 12, 0, 34),
			Size = UDim2.new(1, -buttonWidth - 24, 0, 20),
			BackgroundTransparency = 1,
			TextColor3 = COLORS.Sub,
			Font = Enum.Font.Gotham,
			TextScaled = true,
			TextXAlignment = Enum.TextXAlignment.Left,
			Parent = frame,
		})
	end
	for i, b in buttons do
		b.AnchorPoint = Vector2.new(1, 0.5)
		b.Position = UDim2.new(1, -10 - (#buttons - i) * 110, 0.5, 0)
		b.Size = UDim2.new(0, 100, 0, 40)
		b.Parent = frame
	end
	return frame
end

local function heading(text: string)
	order += 1
	make("TextLabel", {
		LayoutOrder = order,
		Text = text,
		Size = UDim2.new(1, -8, 0, 26),
		BackgroundTransparency = 1,
		TextColor3 = COLORS.Gold,
		Font = Enum.Font.GothamBold,
		TextScaled = true,
		TextXAlignment = Enum.TextXAlignment.Left,
		Parent = content,
	})
end

------------------------------------------------------------------------
-- Robux
------------------------------------------------------------------------

local function priceOf(key: string): number
	return prices[key] or Config.GamePasses[key].Price
end

local function buyPass(key: string)
	local pass = Config.GamePasses[key]
	if pass.Id == 0 then
		toast("Deze gamepass is nog niet ingesteld. Zet het ID in Config.luau")
		return
	end
	MarketplaceService:PromptGamePassPurchase(player, pass.Id)
end

-- Haal de echte prijzen op van Roblox (als de ID's zijn ingevuld)
task.spawn(function()
	for key, pass in Config.GamePasses do
		if pass.Id ~= 0 then
			local ok, info = pcall(MarketplaceService.GetProductInfo, MarketplaceService, pass.Id, Enum.InfoType.GamePass)
			if ok and info and info.PriceInRobux then
				prices[key] = info.PriceInRobux
			end
		end
	end
end)

local function myRole(): string
	return player:GetAttribute("Role") or "Burger"
end

------------------------------------------------------------------------
-- Menu's
------------------------------------------------------------------------

local menus: { [string]: () -> () } = {}

menus.Vehicles = function()
	title.Text = "🚗 Voertuigen"

	heading("Kleur")
	order += 1
	local swatches = make("Frame", {
		LayoutOrder = order,
		Size = UDim2.new(1, -8, 0, 40),
		BackgroundTransparency = 1,
		Parent = content,
	}, {
		make("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 6) }),
	})
	for _, c in Config.VehicleColors do
		local swatch = make("TextButton", {
			Text = c.Name == selectedColor and "✔" or "",
			TextColor3 = Color3.new(1, 1, 1),
			TextStrokeTransparency = 0,
			Font = Enum.Font.GothamBold,
			TextSize = 20,
			Size = UDim2.new(0, 38, 0, 38),
			BackgroundColor3 = c.Color,
			Parent = swatches,
		}, { corner(19) })
		swatch.Activated:Connect(function()
			selectedColor = c.Name
			menus.Vehicles()
		end)
	end

	heading("Kies een voertuig")
	for _, v in Config.Vehicles do
		local sub = "Max " .. v.MaxSpeed .. " km/u"
		local b: TextButton
		if v.Role and myRole() ~= v.Role then
			b = textButton("Alleen " .. v.Role, COLORS.Grey, UDim2.new(), nil)
		elseif v.GamePass and not passes[v.GamePass] then
			local key = v.GamePass
			b = textButton("🔒 R$ " .. priceOf(key), COLORS.Gold, UDim2.new(), function()
				buyPass(key)
			end)
			sub ..= " • " .. Config.GamePasses[key].Name
		else
			b = textButton("Rijden", COLORS.Green, UDim2.new(), function()
				Remotes.Event("SpawnVehicle"):FireServer(v.Id, selectedColor)
				panel.Visible = false
				currentMenu = nil
			end)
		end
		row(v.Name, sub, { b })
	end

	order += 1
	local remove = textButton("Voertuig wegzetten", COLORS.Red, UDim2.new(1, -8, 0, 44), function()
		Remotes.Event("DespawnVehicle"):FireServer()
	end)
	remove.LayoutOrder = order
	remove.Parent = content

	order += 1
	make("TextLabel", {
		LayoutOrder = order,
		Text = "Rijden: W/S = gas/remmen, A/D = sturen, Spatie = uitstappen",
		Size = UDim2.new(1, -8, 0, 20),
		BackgroundTransparency = 1,
		TextColor3 = COLORS.Sub,
		Font = Enum.Font.Gotham,
		TextScaled = true,
		Parent = content,
	})
end

menus.Houses = function()
	title.Text = "🏠 Huizen"

	local mine = nil
	for _, h in houses do
		if h.OwnerUserId == player.UserId then
			mine = h
		end
	end

	if mine then
		heading("Jouw huis")
		local id = mine.Id
		row(mine.Name, mine.Locked and "🔒 Op slot" or "🔓 Open", {
			textButton(mine.Locked and "Open" or "Op slot", COLORS.Blue, UDim2.new(), function()
				Remotes.Event("ToggleLock"):FireServer()
			end),
			textButton("Ga erheen", COLORS.Green, UDim2.new(), function()
				Remotes.Event("GoToHouse"):FireServer(id)
				panel.Visible = false
				currentMenu = nil
			end),
		})
		order += 1
		local leave = textButton("Verhuizen (huis loslaten)", COLORS.Red, UDim2.new(1, -8, 0, 40), function()
			Remotes.Event("LeaveHouse"):FireServer()
		end)
		leave.LayoutOrder = order
		leave.Parent = content
	end

	heading("Alle huizen")
	for _, h in houses do
		local id = h.Id
		local status
		if h.Owner then
			status = "Van " .. h.Owner
		else
			status = h.Premium and "👑 Premium villa • vrij" or "Vrij"
		end
		local buttons = {
			textButton("Bekijk", COLORS.Grey, UDim2.new(), function()
				Remotes.Event("GoToHouse"):FireServer(id)
				panel.Visible = false
				currentMenu = nil
			end),
		}
		if not h.Owner then
			if h.Premium and not passes.Premium then
				table.insert(buttons, textButton("🔒 R$ " .. priceOf("Premium"), COLORS.Gold, UDim2.new(), function()
					buyPass("Premium")
				end))
			else
				table.insert(buttons, textButton("Claim", COLORS.Green, UDim2.new(), function()
					Remotes.Event("ClaimHouse"):FireServer(id)
				end))
			end
		end
		row(h.Name, status, buttons)
	end
end

menus.Roles = function()
	title.Text = "👔 Banen & rollen"
	for _, r in Config.Roles do
		local b
		if myRole() == r.Id then
			b = textButton("✔ Gekozen", COLORS.Grey, UDim2.new(), nil)
		else
			b = textButton("Kies", COLORS.Blue, UDim2.new(), function()
				Remotes.Event("SetRole"):FireServer(r.Id)
			end)
		end
		row(r.Name, r.Description, { b })
	end
end

menus.Shop = function()
	title.Text = "💎 Winkel (Robux)"
	for _, key in Config.GamePassOrder do
		local pass = Config.GamePasses[key]
		local b
		if passes[key] then
			b = textButton("✔ In bezit", COLORS.Grey, UDim2.new(), nil)
		else
			b = textButton("R$ " .. priceOf(key), COLORS.Gold, UDim2.new(), function()
				buyPass(key)
			end)
		end
		row(pass.Icon .. " " .. pass.Name, pass.Description, { b })
	end
end

local function shopMenu(shop: string, heading: string)
	return function()
		title.Text = heading
		for _, f in Config.Food do
			if f.Shop == shop then
				row(f.Name, "Gratis", {
					textButton("Pakken", COLORS.Green, UDim2.new(), function()
						Remotes.Event("OrderFood"):FireServer(f.Id)
					end),
				})
			end
		end
	end
end
menus["Food:Snackbar"] = shopMenu("Snackbar", "🍟 Snackbar")
menus["Food:Supermarkt"] = shopMenu("Supermarkt", "🛒 Supermarkt")

local function openMenu(name: string?)
	if name == nil or (currentMenu == name and panel.Visible) then
		panel.Visible = false
		currentMenu = nil
		return
	end
	currentMenu = name
	clearContent()
	menus[name]()
	content.CanvasPosition = Vector2.zero
	panel.Visible = true
end

local function refresh()
	if currentMenu and panel.Visible then
		local scroll = content.CanvasPosition
		clearContent()
		menus[currentMenu]()
		content.CanvasPosition = scroll
	end
end

closeButton.Activated:Connect(function()
	openMenu(nil)
end)

------------------------------------------------------------------------
-- Knoppen links op het scherm
------------------------------------------------------------------------

local sidebar = make("Frame", {
	AnchorPoint = Vector2.new(0, 0.5),
	Position = UDim2.new(0, 10, 0.5, 0),
	Size = UDim2.new(0, 64, 0, 4 * 70),
	BackgroundTransparency = 1,
	Parent = gui,
}, {
	make("UIListLayout", { Padding = UDim.new(0, 8), SortOrder = Enum.SortOrder.LayoutOrder }),
})

for i, item in {
	{ Icon = "🚗", Menu = "Vehicles", Color = COLORS.Blue },
	{ Icon = "🏠", Menu = "Houses", Color = COLORS.Green },
	{ Icon = "👔", Menu = "Roles", Color = Color3.fromRGB(150, 90, 210) },
	{ Icon = "💎", Menu = "Shop", Color = COLORS.Gold },
} do
	local b = make("TextButton", {
		LayoutOrder = i,
		Text = item.Icon,
		TextScaled = true,
		Font = Enum.Font.GothamBold,
		Size = UDim2.new(0, 62, 0, 62),
		BackgroundColor3 = item.Color,
		TextColor3 = Color3.new(1, 1, 1),
		Parent = sidebar,
	}, { corner(14), make("UIStroke", { Color = Color3.new(1, 1, 1), Thickness = 2, Transparency = 0.4 }) })
	b.Activated:Connect(function()
		openMenu(item.Menu)
	end)
end

------------------------------------------------------------------------
-- Gegevens van de server
------------------------------------------------------------------------

Remotes.Event("Notify").OnClientEvent:Connect(toast)
Remotes.Event("PassesChanged").OnClientEvent:Connect(function(list)
	passes = list
	refresh()
end)
Remotes.Event("HousesChanged").OnClientEvent:Connect(function(list)
	houses = list
	refresh()
end)
Remotes.Event("OpenMenu").OnClientEvent:Connect(function(name)
	if menus[name] then
		currentMenu = nil
		openMenu(name)
	end
end)
player:GetAttributeChangedSignal("Role"):Connect(refresh)

task.spawn(function()
	local state = Remotes.Function("GetState"):InvokeServer()
	passes = state.Passes
	houses = state.Houses
	refresh()
end)

------------------------------------------------------------------------
-- Politie: "Arresteer"-knop bij boeven in de buurt
------------------------------------------------------------------------

task.spawn(function()
	while true do
		task.wait(1)
		local isPolice = myRole() == "Politie"
		for _, other in Players:GetPlayers() do
			if other ~= player and other.Character then
				local root = other.Character:FindFirstChild("HumanoidRootPart")
				if root then
					local prompt = root:FindFirstChild("ArrestPrompt") :: ProximityPrompt?
					local wanted = isPolice and other:GetAttribute("Role") == "Boef" and not other:GetAttribute("JailedUntil")
					if wanted and not prompt then
						local p = Instance.new("ProximityPrompt")
						p.Name = "ArrestPrompt"
						p.ActionText = "Arresteer"
						p.ObjectText = other.DisplayName
						p.KeyboardKeyCode = Enum.KeyCode.F
						p.HoldDuration = 0.5
						p.MaxActivationDistance = Config.ArrestDistance - 2
						p.RequiresLineOfSight = false
						p.Triggered:Connect(function()
							Remotes.Event("Arrest"):FireServer(other)
						end)
						p.Parent = root
					elseif not wanted and prompt then
						prompt:Destroy()
					end
				end
			end
		end
	end
end)

toast("Welkom in " .. Config.TownName .. "! Gebruik de knoppen links. 🌞")
