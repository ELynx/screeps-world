const spawnXspawnCreepXgate = function (spawn) {
  if (spawn.room.energyAvailable < SPAWN_ENERGY_CAPACITY) {
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

const getCreep = function (creepName, spawnName, spawnDirection) {
  const creep = Game.creeps[creepName]

  if (creep === undefined) {
    const spawn = Game.spawns[spawnName]

    if (spawn === undefined) {
      console.log('No spawn [' + spawnName + '] found for creep [' + creepName + ']')
      return undefined
    }

    if (spawn.spawning) {
      return undefined
    }

    if (spawn.__spawned_this_tick__) {
      return undefined
    }

    if (spawnXspawnCreepXgate(spawn) !== OK) {
      return undefined
    }

    const body = makeBody(spawn.room)
    if (body.length === 0) {
      return undefined
    }

    spawn.spawnCreep(body, creepName, { directions: [spawnDirection] })
    spawn.__spawned_this_tick__ = true

    return undefined
  }

  return creep
}

const creepUpgradeController = function (creep) {
  return creep.upgradeController(creep.room.controller)
}

const creepDowngradeController = function (creep) {
  if (_.random(1, 6) === 6) {
    return creepUpgradeController(creep)
  }

  return ERR_BUSY
}

const creepRestock = function (creep) {
  const structures = creep.room.find(FIND_STRUCTURES)

  const withEnergyDemand = _.filter(structures, x => (x.store && x.store.getFreeCapacity(RESOURCE_ENERGY) > 0))

  const near = _.filter(withEnergyDemand, x => x.pos.isNearTo(creep))
  if (near.length === 0) {
    return ERR_NOT_FOUND
  }

  return creep.transfer(_.sample(near), RESOURCE_ENERGY)
}

const ROAD_HITS_WALL = ROAD_HITS * CONSTRUCTION_COST_ROAD_WALL_RATIO // 5000 * 150 = 750000

const repairTargets = function (room) {
  if (room.__creep_repair_cache__) {
    return room.__creep_repair_cache__
  }

  const structures = room.find(FIND_STRUCTURES)

  const canBeRepaired = _.filter(structures, x => (CONSTRUCTION_COST[x.structureType] && x.hits && x.hitsMax && x.hits < x.hitsMax))
  const mineOrNeutral = _.filter(canBeRepaired, x => (x.my || true))

  const targets = _.filter(
    mineOrNeutral,
    function (structure) {
      if (structure.structureType === STRUCTURE_WALL || structure.structureType === STRUCTURE_RAMPART) {
        return structure.hits < 5000
      }

      if (structure.structureType === STRUCTURE_ROAD) {
        // repair only wall road, and not immediately
        return structure.hitsMax === ROAD_HITS_WALL && (structure.hitsMax - structure.hits >= ROAD_HITS)
      }

      return true
    }
  )

  room.__creep_repair_cache__ = targets

  return targets
}

const creepRepair = function (creep) {
  const targets = repairTargets(creep.room)

  const inRange = _.filter(targets, x => x.pos.inRangeTo(creep, 3))
  if (inRange.length === 0) {
    return ERR_NOT_FOUND
  }

  return creep.repair(_.sample(inRange))
}

const creepBuild = function (creep) {
  const constructionSites = creep.room.find(FIND_CONSTRUCTION_SITES)

  const inRange = _.filter(constructionSites, x => x.pos.inRangeTo(creep, 3))
  if (inRange.length === 0) {
    return ERR_NOT_FOUND
  }

  return creep.build(_.sample(inRange))
}

const grabTargets = function (room) {
  if (room.__grab_cache__) {
    return room.__grab_cache__
  }

  const tombstones = room.find(FIND_TOMBSTONES)
  const ruins = room.find(FIND_RUINS)
  const resources = room.find(FIND_DROPPED_RESOURCES)

  const grabs = []

  for (const tombstone of tombstones) {
    if (tombstone.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
      grabs.push(
        {
          type: LOOK_TOMBSTONES,
          [LOOK_TOMBSTONES]: tombstone
        }
      )
    }
  }

  for (const ruin of ruins) {
    if (ruin.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
      grabs.push(
        {
          type: LOOK_RUINS,
          [LOOK_RUINS]: ruin
        }
      )
    }
  }

  for (const resource of resources) {
    if (resource.resourceType === RESOURCE_ENERGY) {
      if (resource.amount > 0) {
        grabs.push(
          {
            type: LOOK_RESOURCES,
            [LOOK_RESOURCES]: resource
          }
        )
      }
    }
  }

  room.__grab_cache__ = grabs

  return grabs
}

const creepGrab = function (creep) {
  const grabs = grabTargets(creep.room)

  let didWithdraw = false
  let didPickup = false

  for (const grab of grabs) {
    const from = grab[grab.type]

    if (!creep.pos.isNearTo(from)) continue

    if ((didWithdraw === false) && (grab.type === LOOK_TOMBSTONES || grab.type === LOOK_RUINS)) {
      const rc = creep.withdraw(from, RESOURCE_ENERGY)
      if (rc === OK) {
        didWithdraw = true
      }
    }

    if (didPickup === false && grab.type === LOOK_RESOURCES) {
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

const creepHarvest = function (creep) {
  const sources = creep.room.find(FIND_SOURCES)

  const near = _.filter(sources, x => x.pos.isNearTo(creep))
  if (near.length === 0) {
    console.log('No source found for creep [' + creep.name + ']')
    return ERR_NOT_FOUND
  }

  return creep.harvest(_.sample(near))
}

const creepWork = function (creep) {
  if (creep === undefined) return ERR_INVALID_TARGET

  const energySize = creep.store.getUsedCapacity(RESOURCE_ENERGY)
  const energyCapacity = creep.store.getCapacity(RESOURCE_ENERGY)

  if (creep.memory.work && energySize === 0) {
    creep.memory.work = undefined
  }

  if (energySize >= energyCapacity) {
    creep.memory.work = true
  }

  if (energySize < energyCapacity) {
    creepGrab(creep)
  }

  if (creep.memory.work) {
    if (creepDowngradeController(creep) === OK) return OK
    if (creepRestock(creep) === OK) return OK
    if (creepRepair(creep) === OK) return OK
    if (creepBuild(creep) === OK) return OK
    return creepUpgradeController(creep)
  } else {
    return creepHarvest(creep)
  }
}

const creeps = function () {
  creepWork(getCreep('hamster', 'HamsterHole', LEFT))
  creepWork(getCreep('mousy', 'HamsterHole', BOTTOM))
}

const towerAttack = function (tower, what) {
  const targets = tower.room.find(what)

  const notMine = _.filter(targets, x => !x.my)
  if (notMine.length > 0) {
    return tower.attack(_.sample(notMine))
  }

  return ERR_NOT_FOUND
}

const towerHeal = function (tower, what) {
  const targets = tower.room.find(what)

  const mine = _.filter(targets, x => x.my)
  if (mine.length > 0) {
    return tower.heal(_.sample(mine))
  }

  return ERR_NOT_FOUND
}

const towerWork = function (tower) {
  if (tower.store.getUsedCapacity(RESOURCE_ENERGY) <= 0) {
    return ERR_NOT_ENOUGH_RESOURCES
  }

  if (towerAttack(tower, FIND_CREEPS) === OK) return OK
  if (towerAttack(tower, FIND_POWER_CREEPS) === OK) return OK
  if (towerAttack(tower, FIND_STRUCTURES) === OK) return OK
  if (towerHeal(tower, FIND_CREEPS) === OK) return OK
  return ERR_NOT_FOUND
}

const towersWork = function (room) {
  const structures = room.find(FIND_STRUCTURES)

  const towers = _.filter(structures, _.matchesProperty('structureType', STRUCTURE_TOWER))

  for (const tower of towers) {
    towerWork(tower)
  }
}

const towers = function () {
  for (const roomName in Game.rooms) {
    towersWork(Game.rooms[roomName])
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

Room.prototype.encode = function () {
  // determinism for photo
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

  let photo = ''
  for (const structure of allStructures) {
    const code = structure.takePhoto()
    if (code === undefined) continue

    photo += code
  }

  console.log(photo)

  this.memory.photo = photo
}

Room.prototype.decode = function () {
  const photo = this.memory.photo
  if (photo === undefined) return

  for (let i = 0; i < photo.length; ++i) {
    const code = photo.charCodeAt(i)
    const [position, structureType] = Structure.prototype.decode(code)
    if (structureType === undefined) continue

    this.createConstructionSite(position.x, position.y, structureType)
  }
}

const autobuild = function () {
  const flag = Game.flags.photo
  if (flag) {
    if (flag.room) {
      flag.room.encode()
    }

    flag.remove()

    return
  }

  if (Game.time % 100 === 0) {
    for (const roomName in Game.rooms) {
      Game.rooms[roomName].decode()
    }
  }
}

const generatePixel = function () {
  if (Game.cpu.bucket >= PIXEL_CPU_COST) {
    return Game.cpu.generatePixel()
  }

  return ERR_NOT_ENOUGH_RESOURCES
}

module.exports.loop = function () {
  creeps()
  towers()
  autobuild()
  generatePixel()
}
