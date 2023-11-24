const generatePixel = function () {
  if (Game.cpu.bucket >= PIXEL_CPU_COST) {
    return Game.cpu.generatePixel()
  }

  return ERR_NOT_ENOUGH_RESOURCES
}

const spawnXspawnCreepXgate = function (spawn) {
  if (spawn.room.energyAvailable < SPAWN_ENERGY_CAPACITY) {
    return ERR_NOT_ENOUGH_RESOURCES
  }

  return OK
}

const WorkCarryPairCost = BODYPART_COST[WORK] + BODYPART_COST[CARRY]

const makeBody = function (room) {
  const pairs = Math.floor(room.energyAvailable / WorkCarryPairCost)
  if (pairs <= 0) return []

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

const creepXrepairXgate = function (creep) {
    const structures = creep.room.find(FIND_STRUCTURES)

    const someTower = _.find(structures, _.matchesProperty('structureType', STRUCTURE_TOWER))
    if (someTower) return ERR_BUSY

    return OK
}

const repairTargets = function (room, isTower = false) {
    return []
}

const creepRepair = function (creep) {
    const gateRc = creepXrepairXgate(creep)
    if (gateRc !== OK) return gateRc

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

    if (targets.length > 0) {
        return tower.attack(_.sample(targets))
    }

    return ERR_NOT_FOUND
}

const towerHeal = function (tower, what) {
    const targets = tower.room.find(what)

    if (targets.length > 0) {
        return tower.heal(_.sample(targets))
    }

    return ERR_NOT_FOUND
}

const towerRepair = function (tower) {
    const targets = repairTargets(tower.room, true)

    if (targets.length > 0) {
        return tower.repair(_.sample(targets))
    }

    return ERR_NOT_FOUND
}

const towerWork = function (tower) {
    if (tower.store.getUsedCapacity(RESOURCE_ENERGY) <= 0) {
        return ERR_NOT_ENOUGH_RESOURCES
    }

    if (towerAttack(tower, FIND_HOSTILE_CREEPS) === OK) return OK
    if (towerAttack(tower, FIND_HOSTILE_POWER_CREEPS) === OK) return OK
    // FIND_HOSTILE_STRUCTURES
    if (towerHeal(tower, FIND_MY_CREEPS) === OK) return OK
    return towerRepair(tower)
}

const towersWork = function (room) {
    const structures = room.find(FIND_STRUCTURES)

    const towers = _.filter(structures, _.matchesProperty('structureType', STRUCTURE_TOWER))

    for (const tower of towers) {
        towerWork(tower)
    }
}

const towers = function () {
    for (const roomName of Game.rooms) {
        towersWork(Game.rooms[roomName])
    }
}

module.exports.loop = function () {
  creeps()
  towers()
  generatePixel()
}
