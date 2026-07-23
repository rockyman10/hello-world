--[[
	STARFALL / Meridian Station — combat core, Luau port (worked example).

	Mirrors the turn-meter + affinity + basic-attack heart of prototype/combat.js
	to show the port is mechanical: JS objects -> Lua tables, functions stay
	functions, the balance numbers are identical data. Drop this in a Roblox
	ModuleScript (ServerScriptService) and require() it; it has no engine
	dependencies, so it also runs under a standalone Lua/Luau interpreter.

	This is intentionally a *slice* (meter, affinity edge, one attack, win check)
	— the full buff/debuff engine and titan phases port the same way.
]]

local Combat = {}

local METER_MAX = 1000

-- Ion beats Cryo beats Plasma beats Ion; Umbral is neutral (mirrors combat.js).
local AFFINITY_BEATS = { ion = "cryo", cryo = "plasma", plasma = "ion" }

-- Deterministic RNG so battles are replayable/testable (mulberry32-style).
local function makeRng(seed)
	local a = seed % 4294967296
	return function()
		a = (a + 0x6D2B79F5) % 4294967296
		local t = a
		t = (t ~ (t >> 15)) * (1 | a) % 4294967296
		t = ((t + ((t ~ (t >> 7)) * (61 | t))) ~ t) % 4294967296
		return ((t ~ (t >> 14)) % 4294967296) / 4294967296
	end
end

local function affinityEdge(att, def)
	if att == "umbral" or def == "umbral" then return 0 end
	if AFFINITY_BEATS[att] == def then return 1 end
	if AFFINITY_BEATS[def] == att then return -1 end
	return 0
end

-- unit def table: { name, side, affinity, hp, atk, def, spd, critRate, critDmg }
local function makeUnit(def, side, idx)
	return {
		id = side .. idx,
		side = side,
		name = def.name,
		affinity = def.affinity,
		atk = def.atk, def = def.def, spd = def.spd,
		maxHp = def.hp, hp = def.hp,
		critRate = def.critRate or 0.15, critDmg = def.critDmg or 1.5,
		meter = 0, alive = true,
	}
end

function Combat.newBattle(seed, heroDefs, foeDefs)
	local state = { rng = makeRng(seed or os.time()), units = {}, log = {}, winner = nil }
	for i, h in ipairs(heroDefs) do table.insert(state.units, makeUnit(h, "hero", i)) end
	for i, f in ipairs(foeDefs) do table.insert(state.units, makeUnit(f, "foe", i)) end
	for _, u in ipairs(state.units) do u.meter = state.rng() * 200 end
	return state
end

local function livingEnemies(state, unit)
	local out = {}
	for _, u in ipairs(state.units) do
		if u.alive and u.side ~= unit.side then table.insert(out, u) end
	end
	return out
end

-- Advance turn meters by Speed until someone reaches 100%; return that actor.
function Combat.nextActor(state)
	local guard = 0
	while true do
		local ready, best = nil, -1
		for _, u in ipairs(state.units) do
			if u.alive and u.meter >= METER_MAX and u.meter > best then ready, best = u, u.meter end
		end
		if ready then return ready end
		for _, u in ipairs(state.units) do if u.alive then u.meter = u.meter + u.spd * 0.1 end end
		guard = guard + 1
		if guard > 100000 then error("turn meter stalled") end
	end
end

local function lowestHpEnemy(state, unit)
	local foes, best, bestFrac = livingEnemies(state, unit), nil, 2
	for _, f in ipairs(foes) do
		local frac = f.hp / f.maxHp
		if frac < bestFrac then best, bestFrac = f, frac end
	end
	return best
end

-- Basic attack with affinity edge + crit (mirrors combat.js dealDamage core).
function Combat.attack(state, attacker, target)
	local edge = affinityEdge(attacker.affinity, target.affinity)
	local dmg = attacker.atk * (1 - target.def / (target.def + 900))
	dmg = dmg * (0.9 + state.rng() * 0.2)
	local tag = ""
	if edge == -1 and state.rng() < 0.3 then
		dmg = dmg * 0.7; tag = " (weak)"
	elseif state.rng() < attacker.critRate + (edge == 1 and 0.3 or 0) then
		dmg = dmg * attacker.critDmg; tag = " (CRIT)"
	end
	dmg = math.floor(dmg + 0.5)
	target.hp = math.max(0, target.hp - dmg)
	table.insert(state.log, string.format("%s hits %s for %d%s", attacker.name, target.name, dmg, tag))
	if target.hp == 0 then
		target.alive = false
		table.insert(state.log, target.name .. " is destroyed!")
	end
end

function Combat.battleOver(state)
	local heroes, foes = false, false
	for _, u in ipairs(state.units) do
		if u.alive then if u.side == "hero" then heroes = true else foes = true end end
	end
	if heroes and foes then return nil end
	return heroes and "hero" or "foe"
end

-- One auto step: pick actor, attack the weakest enemy, reset meter.
function Combat.stepAuto(state)
	state.winner = Combat.battleOver(state)
	if state.winner then return nil end
	local actor = Combat.nextActor(state)
	actor.meter = 0
	local target = lowestHpEnemy(state, actor)
	if target then Combat.attack(state, actor, target) end
	state.winner = Combat.battleOver(state)
	return actor
end

Combat.METER_MAX = METER_MAX
Combat.affinityEdge = affinityEdge
Combat.makeRng = makeRng
return Combat
