-- Build: hulpfuncties om onderdelen (parts) te maken met code.

local Build = {}

Build.FrameColor = Color3.fromRGB(38, 38, 44)

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

-- Staande cilinder (zoals een paal). Roblox-cilinders liggen standaard op hun zij.
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
	local glass = Build.New("Part", {
		CFrame = cf,
		Size = size,
		Color = Color3.fromRGB(165, 205, 230),
		Material = Enum.Material.Glass,
		Transparency = 0.5,
		Reflectance = 0.15,
		Parent = parent,
	})
	glass.CastShadow = false
	return glass
end

-- Zet tekst op een kant van een part.
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
	label.Font = Enum.Font.GothamBlack
	label.Parent = gui
	return label
end

function Build.Light(part: BasePart, color: Color3, range: number, brightness: number): PointLight
	local light = Instance.new("PointLight")
	light.Color = color
	light.Range = range
	light.Brightness = brightness
	light.Shadows = false
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

-- Raamkozijn met glas en (bij brede ramen) tussenstijlen.
function Build.Window(parent: Instance, cf: CFrame, w: number, h: number, depth: number, frameColor: Color3?)
	local fc = frameColor or Build.FrameColor
	local f = 0.35
	local d = depth + 0.3
	Build.Glass(parent, cf, Vector3.new(w, h, 0.25))
	Build.Box(parent, cf * CFrame.new(-w / 2 + f / 2, 0, 0), Vector3.new(f, h, d), fc)
	Build.Box(parent, cf * CFrame.new(w / 2 - f / 2, 0, 0), Vector3.new(f, h, d), fc)
	Build.Box(parent, cf * CFrame.new(0, h / 2 - f / 2, 0), Vector3.new(w, f, d), fc)
	Build.Box(parent, cf * CFrame.new(0, -h / 2 + f / 2, 0), Vector3.new(w + 0.4, f, d + 0.3), fc)
	local bars = math.floor(w / 7)
	for i = 1, bars do
		local x = -w / 2 + i * w / (bars + 1)
		Build.Box(parent, cf * CFrame.new(x, 0, 0), Vector3.new(0.25, h, d - 0.1), fc)
	end
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
			Build.Window(parent, cf * CFrame.new(hole.x, (hole.bottom + hole.top) / 2, 0), hole.w, hole.top - hole.bottom, t, hole.frame)
		end
		cursor = right
	end
	segment(cursor, length / 2, 0, height)
end

-- Ramen gelijk verdeeld over een muur. skip = x-posities (bv. deuren) waar geen raam mag.
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

-- Vloer met een gat (voor een trap). cf = midden bovenkant van de vloer.
function Build.FloorWithHole(parent: Instance, cf: CFrame, w: number, d: number, hole: any, color: Color3, material: Enum.Material?)
	local t = 0.6
	local x1, x2 = hole.x - hole.w / 2, hole.x + hole.w / 2
	local z1, z2 = hole.z - hole.d / 2, hole.z + hole.d / 2
	local function slab(ax: number, bx: number, az: number, bz: number)
		if bx - ax > 0.01 and bz - az > 0.01 then
			Build.Box(parent, cf * CFrame.new((ax + bx) / 2, -t / 2, (az + bz) / 2), Vector3.new(bx - ax, t, bz - az), color, material)
		end
	end
	slab(-w / 2, x1, -d / 2, d / 2)
	slab(x2, w / 2, -d / 2, d / 2)
	slab(x1, x2, -d / 2, z1)
	slab(x1, x2, z2, d / 2)
end

-- Trap die vanaf cf (onderkant, voorrand) richting +Z omhoog gaat.
function Build.Stairs(parent: Instance, cf: CFrame, width: number, rise: number, run: number, color: Color3, material: Enum.Material?)
	local steps = math.max(1, math.floor(rise / 0.8 + 0.5))
	local h = rise / steps
	local r = run / steps
	for i = 1, steps do
		Build.Box(parent, cf * CFrame.new(0, h * i - 0.3, r * (i - 0.5)), Vector3.new(width, 0.6, r + 0.15), color, material)
	end
	-- schuine glazen leuning aan de open kant
	local length = math.sqrt(rise * rise + run * run)
	local angle = math.atan2(rise, run)
	local center = cf * CFrame.new(width / 2 + 0.15, rise / 2 + 1.8, run / 2) * CFrame.Angles(-angle, 0, 0)
	local rail = Build.Glass(parent, center, Vector3.new(0.2, 3, length))
	rail.Transparency = 0.6
	Build.Box(parent, center * CFrame.new(0, 1.55, 0), Vector3.new(0.3, 0.2, length), Build.FrameColor, Enum.Material.Metal)
end

-- Glazen reling tussen twee punten (op vloerhoogte).
function Build.Railing(parent: Instance, a: Vector3, b: Vector3, height: number?)
	local h = height or 3.2
	local length = (b - a).Magnitude
	if length < 0.1 then
		return
	end
	local center = (a + b) / 2 + Vector3.new(0, h / 2, 0)
	local cf = CFrame.lookAt(center, center + (b - a))
	local glass = Build.Glass(parent, cf, Vector3.new(0.2, h, length))
	glass.Transparency = 0.6
	Build.Box(parent, cf * CFrame.new(0, h / 2 + 0.1, 0), Vector3.new(0.35, 0.2, length + 0.2), Build.FrameColor, Enum.Material.Metal)
end

return Build
