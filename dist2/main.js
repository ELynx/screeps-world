module.exports.loop = function () {
  creeps()
  autobuild()
  generatePixel()
}

const creeps = function () {
  const roomA = 'E56N59'
  const x1A = 36
  const y1A = 3
  const x2A = 36
  const y2A = 4

  work(getCreep('hamster', roomA, x1A, y1A, x2A, y2A))
  work(getCreep('mousy', roomA, x2A, y2A, x1A, y1A))
}

const work = function (creep) {
  if (creep === undefined) return ERR_INVALID_TARGET

  grab(creep)
  upgradeController(creep)
  restock(creep)
  repair(creep)
  build(creep)
  harvest(creep)
}

const grab = function (creep) {
  const targets = getGrabTargets(creep.room)

  let didWithdraw = false
  let didPickup = false

  for (const target of targets) {
    const from = target[target.type]

    if (!creep.pos.isNearTo(from)) continue

    if ((didWithdraw === false) && (target.type === LOOK_TOMBSTONES || target.type === LOOK_RUINS)) {
      const rc = creep.withdraw(from, RESOURCE_ENERGY)
      if (rc === OK) {
        didWithdraw = true
      }
    }

    if (didPickup === false && target.type === LOOK_RESOURCES) {
      const rc = creep.pickup(from)
      if (rc === 0) {
        didPickup = true
      }
    }

    if (didWithdraw && didPickup) break
  }

  if (didWithdraw || didPickup) return OK

  return ERR_NOT_FOUND
}

const upgradeController = function (creep) {
  const rc = creep.upgradeController(creep.room.controller)

  if (rc === OK) {
    creep.__upgraded_controller__ = true
  }

  return rc
}

const restock = function (creep) {
  const targets = creep.room.find(FIND_STRUCTURES)

  const withEnergyDemand = _.filter(targets, x => (x.store && x.store.getFreeCapacity(RESOURCE_ENERGY) > 0))

  const near = _.filter(withEnergyDemand, x => x.pos.isNearTo(creep))
  if (near.length === 0) {
    return ERR_NOT_FOUND
  }

  return creep.transfer(_.sample(near), RESOURCE_ENERGY)
}

const repair = function (creep) {
  const targets = getRepairTargets(creep.room)

  const inRange = _.filter(targets, x => x.pos.inRangeTo(creep, 3))
  if (inRange.length === 0) {
    return ERR_NOT_FOUND
  }

  return creep.repair(_.sample(inRange))
}

const build = function (creep) {
  const targets = creep.room.find(FIND_CONSTRUCTION_SITES)

  const inRange = _.filter(targets, x => x.pos.inRangeTo(creep, 3))
  if (inRange.length === 0) {
    return ERR_NOT_FOUND
  }

  return creep.build(_.sample(inRange))
}

const harvest = function (creep) {
  const targets = creep.room.find(FIND_SOURCES_ACTIVE)

  const near = _.filter(targets, x => x.pos.isNearTo(creep))
  if (near.length === 0) {
    console.log('No source found for creep [' + creep.name + ']')
    return ERR_NOT_FOUND
  }

  const rc = creep.harvest(_.sample(near))

  if (rc === OK) {
    creep.__harvested__ = true
  }

  return rc
}

const getCreep = function (creepName, roomName, x, y, xKeep = undefined, yKeep = undefined) {
  const name1 = creepName
  const name2 = makeAlternativeName(creepName)

  spawnCreep(name1, name2, roomName, x, y, xKeep, yKeep)

  const creep1 = Game.creeps[name1]
  if (creep1 && creep1.spawning === false) {
    return creep1
  }

  const creep2 = Game.creeps[name2]
  if (creep2 && creep2.spawning === false) {
    return creep2
  }

  return undefined
}

const getGrabTargets = function (room) {
  if (room.__grab_target_cache__) {
    return room.__grab_target_cache__
  }

  const tombstones = room.find(FIND_TOMBSTONES)
  const ruins = room.find(FIND_RUINS)
  const resources = room.find(FIND_DROPPED_RESOURCES)

  const targets = []

  for (const tombstone of tombstones) {
    if (tombstone.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
      targets.push(
        {
          type: LOOK_TOMBSTONES,
          [LOOK_TOMBSTONES]: tombstone
        }
      )
    }
  }

  for (const ruin of ruins) {
    if (ruin.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
      targets.push(
        {
          type: LOOK_RUINS,
          [LOOK_RUINS]: ruin
        }
      )
    }
  }

  for (const resource of resources) {
    if (resource.resourceType === RESOURCE_ENERGY && resource.amount > 0) {
      targets.push(
        {
          type: LOOK_RESOURCES,
          [LOOK_RESOURCES]: resource
        }
      )
    }
  }

  room.__grab_target_cache__ = targets

  return targets
}

const getRepairTargets = function (room) {
  if (room.__repair_target_cache__) {
    return room.__repair_target_cache__
  }

  const structures = room.find(FIND_STRUCTURES)

  const canBeRepaired = _.filter(structures, x => (CONSTRUCTION_COST[x.structureType] && x.hits && x.hitsMax && x.hits < x.hitsMax))
  const mineOrNeutral = _.filter(canBeRepaired, x => (x.my || true))

  room.__repair_target_cache__ = mineOrNeutral

  return mineOrNeutral
}

const makeAlternativeName = function (name) {
  return name.replace('a', 'ä').replace('o', 'ö').replace('u', 'ü').replace('e', 'ё')
}

const spawnCreep = function (name1, name2, roomName, x, y, xKeep = undefined, yKeep = undefined) {
  // gate
  const room = Game.rooms[roomName]
  const gateRc = spawnCreepXgate(room)
  if (gateRc !== OK) {
    return gateRc
  }

  // if something is already spawning
  const creep1 = Game.creeps[name1]
  if (creep1 && creep1.spawning) {
    return OK
  }

  // if something is already spawning
  const creep2 = Game.creeps[name2]
  if (creep2 && creep2.spawning) {
    return OK
  }

  // if both creeps are present, error state
  if (creep1 && creep2) {
    return ERR_BUSY
  }

  // one of them has to be undefined
  // both can be undefined
  const creep = creep1 || creep2

  // see if preemprive spawn is needed
  const body = makeBody(room)
  if (body.length === 0) {
    return ERR_NOT_ENOUGH_RESOURCES
  }

  // by default, give 1st name
  let creepName = name1
  const otherCreepName = name2

  // check if creep with enough life exists
  if (creep) {
    const ticksToSpawn = body.length * CREEP_SPAWN_TIME
    if (creep.ticksToLive > ticksToSpawn) {
      return OK
    }

    if (creep.name === creepName) {
      creepName = otherCreepName
    }
  }

  const prio1 = []
  const prio2 = []

  for (const spawnName in Game.spawns) {
    const spawn = Game.spawns[spawnName]

    if (spawn.room.name !== room.name) continue

    if (xKeep !== undefined && yKeep !== undefined && spawn.pos.isNearTo(xKeep, yKeep)) {
      prio2.push(spawn)
    } else {
      prio1.push(spawn)
    }
  }

  const queue = prio1.concat(prio2)

  if (queue.length === 0) {
    console.log('No spawn in room [' + roomName + '] found for creep [' + creepName + ']')
    return ERR_NOT_FOUND
  }

  for (const spawn of queue) {
    if (spawn.spawning) continue
    if (spawn.__spawned_this_tick__) continue

    const spawnDirection = spawn.pos.getDirectionTo(x, y)

    const spawnRc = spawn.spawnCreep(body, creepName, { directions: [spawnDirection] })
    if (spawnRc === OK) {
      spawn.__spawned_this_tick__ = true
      return OK
    }
  }

  return ERR_NOT_FOUND
}

const spawnCreepXgate = function (room) {
  if (room === undefined) {
    return ERR_INVALID_TARGET
  }

  if (room.energyAvailable < SPAWN_ENERGY_CAPACITY) {
    return ERR_NOT_ENOUGH_RESOURCES
  }

  return OK
}

const WorkCarryPairCost = BODYPART_COST[WORK] + BODYPART_COST[CARRY]

const makeBody = function (room) {
  const pairs = Math.floor(room.energyAvailable / WorkCarryPairCost)
  if (pairs <= 0) {
    return []
  }

  const work = new Array(pairs)
  work.fill(WORK)

  const carry = new Array(pairs)
  carry.fill(CARRY)

  return _.shuffle(work.concat(carry))
}

const autobuild = function () {
  const flag = Game.flags.savePlan
  if (flag) {
    if (flag.room) {
      flag.room.savePlan()
    }

    flag.remove()

    return
  }

  if (Game.time % 100 === 0) {
    for (const roomName in Game.rooms) {
      Game.rooms[roomName].buildFromPlan()
    }
  }
}

Room.prototype.savePlan = function () {
  const allStructures = this
    .find(FIND_STRUCTURES)
    .sort(
      function (s1, s2) {
        const index1 = (s1.pos.y + 1) * 100 + s1.pos.x
        const index2 = (s2.pos.y + 1) * 100 + s2.pos.x
        if (index1 === index2) return s1.structureType.localeCompare(s2.structureType)

        return index1 - index2
      }
    )

  let plan = ''
  for (const structure of allStructures) {
    const code = structure.encode()
    if (code === undefined) continue

    plan += code
  }

  if (plan === '') {
    plan = undefined
  }

  this.memory.plan = plan
}

Room.prototype.buildFromPlan = function () {
  const plan = this.memory.plan
  if (plan === undefined) return

  for (let i = 0; i < plan.length; ++i) {
    const code = plan.charCodeAt(i)
    const [position, structureType] = Structure.prototype.decode(code)
    if (structureType === undefined) continue

    this.createConstructionSite(position.x, position.y, structureType)
  }
}

const StructureTypeToIndex = {
  [STRUCTURE_WALL]: 0,
  [STRUCTURE_CONTAINER]: 1,
  [STRUCTURE_EXTENSION]: 2,
  [STRUCTURE_FACTORY]: 3,
  [STRUCTURE_LAB]: 4,
  [STRUCTURE_LINK]: 5,
  [STRUCTURE_NUKER]: 6,
  [STRUCTURE_OBSERVER]: 7,
  [STRUCTURE_POWER_SPAWN]: 8,
  [STRUCTURE_RAMPART]: 9,
  [STRUCTURE_ROAD]: 10,
  [STRUCTURE_SPAWN]: 11,
  [STRUCTURE_STORAGE]: 12,
  // there is nothing on index 13 aka 0b1101 because this lands into forbidden UTF-16
  [STRUCTURE_TERMINAL]: 14,
  [STRUCTURE_TOWER]: 15
}

const IndexToStructureType =
  [
    STRUCTURE_WALL,
    STRUCTURE_CONTAINER,
    STRUCTURE_EXTENSION,
    STRUCTURE_FACTORY,
    STRUCTURE_LAB,
    STRUCTURE_LINK,
    STRUCTURE_NUKER,
    STRUCTURE_OBSERVER,
    STRUCTURE_POWER_SPAWN,
    STRUCTURE_RAMPART,
    STRUCTURE_ROAD,
    STRUCTURE_SPAWN,
    STRUCTURE_STORAGE,
    undefined, // there is nothing on index 13 aka 0b1101 because this lands into forbidden UTF-16
    STRUCTURE_TERMINAL,
    STRUCTURE_TOWER
  ]

Structure.prototype.encode = function () {
  // protection from area walls
  if (this.hits === undefined || this.hitsMax === undefined) return undefined

  const index = StructureTypeToIndex[this.structureType]
  if (index === undefined) return undefined

  const x = this.pos.x
  const y = this.pos.y

  // idea taken from screeps packrat
  const code = (index << 12) | (x << 6) | y

  return String.fromCharCode(code)
}

Structure.prototype.decode = function (code) {
  const index = (code & 0b1111000000000000) >> 12
  const xxxxx = (code & 0b0000111111000000) >> 6
  const yyyyyy = code & 0b0000000000111111

  const structureType = IndexToStructureType[index]

  return [{ x: xxxxx, y: yyyyyy }, structureType]
}

const generatePixel = function () {
  return Game.cpu.generatePixel()
}
