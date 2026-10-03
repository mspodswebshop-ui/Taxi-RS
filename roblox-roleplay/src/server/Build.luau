-- Build: kleine hulpfuncties om onderdelen (parts) te maken met code.

local Build = {}

function Build.New(className: string, props: { [string]: any }): any
	local inst = Instance.new(className)
	if inst:IsA("BasePart") then
		inst.Anchored = true
		inst.TopSurface = Enum.SurfaceType.Smooth
		inst.BottomSurface = Enum.SurfaceType.Smooth
		inst.Material = Enum.Material.SmoothPlastic
	end
	for key, value in props do
		if key ~= "Parent" then
			(inst :: any)[key] = value
		end
	end
	inst.Parent = props.Parent
	return inst
end

function Build.Box(parent: Instance, cf: CFrame, size: Vector3, color: Color3, material: Enum.Material?): Part
	return Build.New("Part", {
		CFrame = cf,
		Size = size,
		Color = color,
		Material = material or Enum.Material.SmoothPlastic,
		Parent = parent,
	})
end

-- Staande cilinder (zoals een paal of fontein). Roblox-cilinders liggen standaard op hun zij.
function Build.Cylinder(parent: Instance, cf: CFrame, height: number, diameter: number, color: Color3, material: Enum.Material?): Part
	return Build.New("Part", {
		Shape = Enum.PartType.Cylinder,
		CFrame = cf * CFrame.Angles(0, 0, math.pi / 2),
		Size = Vector3.new(height, diameter, diameter),
		Color = color,
		Material = material or Enum.Material.SmoothPlastic,
		Parent = parent,
	})
end

function Build.Ball(parent: Instance, cf: CFrame, diameter: number, color: Color3, material: Enum.Material?): Part
	return Build.New("Part", {
		Shape = Enum.PartType.Ball,
		CFrame = cf,
		Size = Vector3.new(diameter, diameter, diameter),
		Color = color,
		Material = material or Enum.Material.SmoothPlastic,
		Parent = parent,
	})
end

function Build.Glass(parent: Instance, cf: CFrame, size: Vector3): Part
	return Build.New("Part", {
		CFrame = cf,
		Size = size,
		Color = Color3.fromRGB(170, 210, 235),
		Material = Enum.Material.Glass,
		Transparency = 0.55,
		Parent = parent,
	})
end

-- Zet tekst op de voorkant (of een andere kant) van een part.
function Build.Sign(part: BasePart, text: string, textColor: Color3, face: Enum.NormalId?): TextLabel
	local gui = Instance.new("SurfaceGui")
	gui.Face = face or Enum.NormalId.Front
	gui.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
	gui.PixelsPerStud = 40
	gui.LightInfluence = 0
	gui.Parent = part

	local label = Instance.new("TextLabel")
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundTransparency = 1
	label.Text = text
	label.TextColor3 = textColor
	label.TextScaled = true
	label.Font = Enum.Font.FredokaOne
	label.Parent = gui
	return label
end

function Build.Light(part: BasePart, color: Color3, range: number, brightness: number): PointLight
	local light = Instance.new("PointLight")
	light.Color = color
	light.Range = range
	light.Brightness = brightness
	light.Parent = part
	return light
end

function Build.Prompt(part: BasePart, actionText: string, objectText: string, distance: number?): ProximityPrompt
	local prompt = Instance.new("ProximityPrompt")
	prompt.ActionText = actionText
	prompt.ObjectText = objectText
	prompt.MaxActivationDistance = distance or 10
	prompt.RequiresLineOfSight = false
	prompt.Parent = part
	return prompt
end

-- Muur langs de lokale X-as, met gaten voor deuren en ramen.
-- cf = midden van de onderkant van de muur.
-- holes = { { x = midden, w = breedte, bottom = onderkant, top = bovenkant, glass = true/false } }
function Build.Wall(
	parent: Instance,
	cf: CFrame,
	length: number,
	height: number,
	holes: { any },
	color: Color3,
	material: Enum.Material?,
	thickness: number?
)
	local t = thickness or 1
	local mat = material or Enum.Material.SmoothPlastic
	table.sort(holes, function(a, b)
		return a.x < b.x
	end)

	local cursor = -length / 2
	local function segment(x1: number, x2: number, y1: number, y2: number)
		if x2 - x1 > 0.01 and y2 - y1 > 0.01 then
			Build.Box(parent, cf * CFrame.new((x1 + x2) / 2, (y1 + y2) / 2, 0), Vector3.new(x2 - x1, y2 - y1, t), color, mat)
		end
	end

	for _, hole in holes do
		local left = hole.x - hole.w / 2
		local right = hole.x + hole.w / 2
		segment(cursor, left, 0, height)
		segment(left, right, 0, hole.bottom)
		segment(left, right, hole.top, height)
		if hole.glass then
			Build.Glass(parent, cf * CFrame.new(hole.x, (hole.bottom + hole.top) / 2, 0), Vector3.new(hole.w, hole.top - hole.bottom, 0.3))
		end
		cursor = right
	end
	segment(cursor, length / 2, 0, height)
end

-- Maak een lijst van ramen die gelijk verdeeld zijn over een muur.
function Build.Windows(length: number, count: number, width: number, bottom: number, top: number, skip: { number }?): { any }
	local holes = {}
	local step = length / count
	for i = 1, count do
		local x = -length / 2 + step * (i - 0.5)
		local blocked = false
		for _, s in skip or {} do
			if math.abs(x - s) < width / 2 + 4 then
				blocked = true
			end
		end
		if not blocked then
			table.insert(holes, { x = x, w = width, bottom = bottom, top = top, glass = true })
		end
	end
	return holes
end

return Build
