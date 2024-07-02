'use strict'

const bootstrap = require('./bootstrap')

const intentSolver = require('./routine.intent')

const Controller = require('./controller.template')

const cook = new Controller('cook')

// STRATEGY demands and supplies
const TerminalEnergyDemand = 30000
const TerminalRoomMineralStore = 200000
const TerminalBaseReagentStore = 5000
const TerminalOtherStuffStore = 25000

const FactoryAnyReagentDemand = 10000
const FactoryGhodiumMeltMaxStore = 15000
const FactoryBatteryMaxStore = 45000
const FactoryTotalMaxStore = 45000

// made up value that is used to plug planned capacity on first assignment
const MadeUpLargeNumber = 1000000

// STRATEGY link send values
const LinkSourceTreshold = LINK_CAPACITY / 8
const LinkDestinationTreshold = LINK_CAPACITY / 8

// STRATEGY CPU reservation strategy
const PostCPUTarget = Game.cpu.limit - 0.5

cook.__adjustPlannedDelta = function (something, resourceType, delta) {
  if (something.__cook__deltaMap === undefined) {
    something.__cook__deltaMap = new Map()
  }

  const now = something.__cook__deltaMap.get(resourceType) || 0
  something.__cook__deltaMap.set(resourceType, now + delta)
}

cook.___plannedDelta = function (something, resourceType) {
  if (something.__cook__deltaMap) {
    return something.__cook__deltaMap.get(resourceType) || 0
  }

  return 0
}

cook.___roomSupply = function (structure, resourceType) {
  const structureType = structure.structureType

  if (structureType === STRUCTURE_CONTAINER ||
      structureType === STRUCTURE_LINK ||
      structureType === STRUCTURE_STORAGE) {
    return intentSolver.getAllUsedCapacity(structure).get(resourceType) || 0
  }

  if (structureType === STRUCTURE_FACTORY) {
    if (resourceType === RESOURCE_GHODIUM_MELT ||
        resourceType === RESOURCE_BATTERY) {
      return 0
    }

    const all = intentSolver.getAllUsedCapacity(structure)

    if (resourceType === RESOURCE_ENERGY) {
      const nowReagent2 = all.get(resourceType) || 0
      const nowReagent1 = all.get(RESOURCE_GHODIUM_MELT) || 0
      if (nowReagent1 <= 0) return nowReagent2

      const toKeep = nowReagent1 * 2
      const free = nowReagent2 - toKeep
      return Math.max(free, 0)
    }

    return all.get(resourceType) || 0
  }

  if (structureType === STRUCTURE_LAB) {
    // nothing, skip
    if (structure.mineralType === undefined) return 0
    // wrong recepie, handle with flush only
    if (structure.mineralType !== resourceType) return 0

    // explicit inputs do not give back
    if (structure.__cook__cache__isSource === true) return 0

    return intentSolver.getUsedCapacity(structure, resourceType) || 0
  }

  if (structureType === STRUCTURE_TERMINAL) {
    if (structure.effects && structure.effects.length > 0) {
      if (_.some(structure.effects, _.matches(PWR_DISRUPT_TERMINAL))) return 0
    }

    const all = intentSolver.getAllUsedCapacity(structure)

    if (resourceType === RESOURCE_ENERGY) {
      const now = all.get(resourceType) || 0
      const free = now - TerminalEnergyDemand
      return Math.max(free, 0)
    }

    return all.get(resourceType) || 0
  }

  return 0
}

cook.__hasSupply = function (structure, resourceType) {
  // save typing down the line
  if (structure === undefined) return false

  const lambda = () => this.___roomSupply(structure, resourceType)
  const supply = intentSolver.getWithIntentCache(structure, '__cook__hasSupply_' + resourceType, lambda)
  const planned = this.___plannedDelta(structure, resourceType)

  return supply + planned > 0
}

cook.___hasFlush = function (structure) {
  if (structure === undefined) return undefined

  const structureType = structure.structureType

  if (structureType === STRUCTURE_CONTAINER) {
    const stored = _.shuffle(intentSolver.getUsedCapacityMinKeys(structure))
    for (const resourceType of stored) {
      if (resourceType === RESOURCE_ENERGY) continue

      if (this.__hasSupply(structure, resourceType)) return resourceType
    }

    return undefined
  }

  if (structureType === STRUCTURE_FACTORY) {
    const stored = _.shuffle(intentSolver.getUsedCapacityMinKeys(structure))
    for (const resourceType of stored) {
      if (resourceType === RESOURCE_GHODIUM_MELT) continue
      if (resourceType === RESOURCE_BATTERY) continue
      if (resourceType === RESOURCE_GHODIUM) continue
      if (resourceType === RESOURCE_ENERGY) continue

      if (this.__hasSupply(structure, resourceType)) return resourceType
    }

    return undefined
  }

  if (structureType === STRUCTURE_LAB) {
    // nothing, ignore
    if (structure.mineralType === undefined) return undefined
    // as planned, ok
    if (structure.__cook__cache__resourceType === structure.mineralType) return undefined

    if (this.__hasSupply(structure, structure.mineralType)) return structure.mineralType

    return undefined
  }

  if (structureType === STRUCTURE_STORAGE) {
    const stored = _.shuffle(intentSolver.getUsedCapacityMinKeys(structure))
    for (const resourceType of stored) {
      if (resourceType === RESOURCE_OPS) continue
      if (resourceType === RESOURCE_POWER) continue

      if (this.__hasSupply(structure, resourceType)) return resourceType
    }

    return undefined
  }

  return undefined
}

cook.___worldSupply = function (structure, resourceType) {
  // if positive -> do not throw around
  // if negative -> resource is marked as "not to give away"
  const worldDemand = this.___worldDemand(structure, resourceType)
  if (worldDemand !== 0) return 0

  if (resourceType === RESOURCE_ENERGY) {
    const sourceLevel = structure.room.memory.slvl || 0
    if (sourceLevel < 2) return 0
    if (this.__hasEnergyDemand(structure)) return 0
    return Math.floor(SOURCE_ENERGY_CAPACITY / 3)
  }

  return this.___roomSupply(structure, resourceType)
}

Structure.prototype.everWant = function (_resourceType) {
  // by default defer to specific calculation
  return true
}

StructureExtension.prototype.everWant = function (resourceType) {
  return resourceType === RESOURCE_ENERGY
}

const Reagents = new Set([..._.keys(REACTIONS), ..._.keys(REACTION_TIME)])

StructureLab.prototype.everWant = function (resourceType) {
  if (resourceType === RESOURCE_ENERGY) return true
  return Reagents.has(resourceType)
}

StructureLink.prototype.everWant = function (resourceType) {
  return resourceType === RESOURCE_ENERGY
}

StructureNuker.prototype.everWant = function (resourceType) {
  return resourceType === RESOURCE_ENERGY || resourceType === RESOURCE_GHODIUM
}

StructurePowerSpawn.prototype.everWant = function (resourceType) {
  return resourceType === RESOURCE_ENERGY || resourceType === RESOURCE_POWER
}

StructureSpawn.prototype.everWant = function (resourceType) {
  return resourceType === RESOURCE_ENERGY
}

StructureTower.prototype.everWant = function (resourceType) {
  return resourceType === RESOURCE_ENERGY
}

cook.___roomDemand = function (structure, resourceType) {
  if (!structure.isActiveSimple) return 0

  const structureType = structure.structureType

  if (structureType === STRUCTURE_EXTENSION ||
      structureType === STRUCTURE_SPAWN ||
      structureType === STRUCTURE_TOWER) {
    return intentSolver.getFreeCapacity(structure, resourceType) || 0
  }

  if (structureType === STRUCTURE_LAB) {
    // load with energy to boost
    if (resourceType === RESOURCE_ENERGY) {
      return intentSolver.getFreeCapacity(structure, resourceType) || 0
    }

    // explicit outputs do not demand in resources, only supply them
    if (structure.__cook__cache__isSource === false) return 0
    if (structure.__cook__cache__resourceType !== resourceType) return 0

    return intentSolver.getFreeCapacity(structure, resourceType) || 0
  }

  if (structureType === STRUCTURE_TERMINAL) {
    if (resourceType !== RESOURCE_ENERGY) return 0

    const now = intentSolver.getAllUsedCapacity(structure).get(resourceType) || 0
    const left = TerminalEnergyDemand - now
    return Math.max(left, 0)
  }

  if (structureType === STRUCTURE_FACTORY) {
    if (resourceType === RESOURCE_GHODIUM_MELT ||
        resourceType === RESOURCE_BATTERY) {
      const now = intentSolver.getAllUsedCapacity(structure).get(resourceType) || 0
      const left = FactoryAnyReagentDemand - now
      return Math.max(left, 0)
    }

    if (resourceType === RESOURCE_ENERGY) {
      const all = intentSolver.getAllUsedCapacity(structure)

      const nowReagent1 = all.get(RESOURCE_GHODIUM_MELT) || 0
      if (nowReagent1 <= 0) return 0

      const nowReagent2 = all.get(resourceType) || 0
      const left = (nowReagent1 * 2) - nowReagent2
      return Math.max(left, 0)
    }

    return 0
  }

  if (structureType === STRUCTURE_NUKER) {
    return intentSolver.getFreeCapacity(structure, resourceType) || 0
  }

  if (structureType === STRUCTURE_POWER_SPAWN) {
    if (resourceType === RESOURCE_ENERGY) {
      const demand = intentSolver.getFreeCapacity(structure, resourceType) || 0
      // STRATEGY avoid repeated trips, 300 or 600 is worker capacity on level 8
      if (demand <= 2400) return 0
      return demand
    }

    if (resourceType === RESOURCE_POWER) {
      const demand = intentSolver.getFreeCapacity(structure, resourceType) || 0
      // STRATEGY avoid repeated trips
      if (demand <= 50) return 0
      return demand
    }

    return 0
  }

  return 0
}

cook._hasDemand = function (structure, resourceType) {
  // save typing down the line
  if (structure === undefined) return false

  // check against type before even looking at capacity
  if (!structure.everWant(resourceType)) return false

  const lambda = () => this.___roomDemand(structure, resourceType)
  const demand = intentSolver.getWithIntentCache(structure, '__cook__hasDemand_' + resourceType, lambda)
  const planned = this.___plannedDelta(structure, resourceType)

  return demand > planned
}

cook.___roomSpace = function (structure, resourceType, forMining = false, forPlunder = false) {
  if (!structure.isActiveSimple) return 0

  const structureType = structure.structureType
  let above = 0

  if (structureType === STRUCTURE_CONTAINER) {
    if (resourceType === RESOURCE_ENERGY) {
      above = intentSolver.getFreeCapacity(structure, resourceType) || 0
    }
  }

  if (structureType === STRUCTURE_FACTORY) {
    const all = intentSolver.getAllUsedCapacity(structure)

    const totalUsed = all.get('total') || 0
    if (totalUsed >= FactoryTotalMaxStore) return 0
    const totalRemaining = FactoryTotalMaxStore - totalUsed

    if (resourceType === RESOURCE_GHODIUM_MELT) {
      const used = all.get(resourceType) || 0
      const remaining = FactoryGhodiumMeltMaxStore - used
      above = Math.max(remaining, 0)
    }

    if (resourceType === RESOURCE_BATTERY) {
      const used = all.get(resourceType) || 0
      const remaining = FactoryBatteryMaxStore - used
      above = Math.max(remaining, 0)
    }

    if (above > 0) {
      const free = intentSolver.getFreeCapacity(structure, resourceType) || 0
      above = Math.min(totalRemaining, free, above)
    }
  }

  if (structureType === STRUCTURE_STORAGE) {
    if (forPlunder ||
        resourceType === RESOURCE_OPS ||
        resourceType === RESOURCE_POWER) {
      above = intentSolver.getFreeCapacity(structure, resourceType) || 0
    }
  }

  // CHEMISTRY add base reagents here
  if (structureType === STRUCTURE_TERMINAL) {
    // it is handled in demand
    if (resourceType !== RESOURCE_ENERGY) {
      const mineralType = structure.room.mineralType()
      let allowed = 0

      if (resourceType === mineralType) {
        allowed += TerminalRoomMineralStore
      }

      if (resourceType === RESOURCE_KEANIUM) {
        allowed += TerminalBaseReagentStore
      }

      if (resourceType === RESOURCE_LEMERGIUM) {
        allowed += TerminalBaseReagentStore
      }

      if (resourceType === RESOURCE_UTRIUM) {
        allowed += TerminalBaseReagentStore
      }

      if (resourceType === RESOURCE_ZYNTHIUM) {
        allowed += TerminalBaseReagentStore
      }

      if (resourceType === RESOURCE_CATALYST) {
        allowed += TerminalBaseReagentStore
      }

      if (resourceType === RESOURCE_HYDROGEN) {
        allowed += TerminalBaseReagentStore
      }

      if (resourceType === RESOURCE_OXYGEN) {
        allowed += TerminalBaseReagentStore
      }

      // one of resources kept by name
      if (allowed > 0) {
        const used = intentSolver.getAllUsedCapacity(structure).get(resourceType) || 0
        // STRATEGY allow overflow of named resources, to be sold
        const remaining = (forMining ? 0 : TerminalOtherStuffStore) + allowed - used
        above = Math.max(remaining, 0)
      } else {
        const all = intentSolver.getAllUsedCapacity(structure)
        const useful = new Map()

        // CHEMISTRY add base reagents here
        useful.set(RESOURCE_KEANIUM, Math.min(all.get(RESOURCE_KEANIUM) || 0, TerminalBaseReagentStore))
        useful.set(RESOURCE_LEMERGIUM, Math.min(all.get(RESOURCE_LEMERGIUM) || 0, TerminalBaseReagentStore))
        useful.set(RESOURCE_UTRIUM, Math.min(all.get(RESOURCE_UTRIUM) || 0, TerminalBaseReagentStore))
        useful.set(RESOURCE_ZYNTHIUM, Math.min(all.get(RESOURCE_ZYNTHIUM) || 0, TerminalBaseReagentStore))
        useful.set(RESOURCE_CATALYST, Math.min(all.get(RESOURCE_CATALYST) || 0, TerminalBaseReagentStore))
        useful.set(RESOURCE_HYDROGEN, Math.min(all.get(RESOURCE_HYDROGEN) || 0, TerminalBaseReagentStore))
        useful.set(RESOURCE_OXYGEN, Math.min(all.get(RESOURCE_OXYGEN) || 0, TerminalBaseReagentStore))

        useful.set(RESOURCE_ENERGY, Math.min(all.get(RESOURCE_ENERGY) || 0, TerminalEnergyDemand))

        // `useful` can be tricked to know if mineralType is one of nuke reagents
        const mineralTypeMax = TerminalRoomMineralStore + (useful.has(mineralType) ? TerminalBaseReagentStore : 0)
        useful.set(mineralType, Math.min(all.get(mineralType) || 0, mineralTypeMax))

        let usedByUseful = 0
        useful.forEach(value => (usedByUseful += value))
        const usedTotal = all.get('total') || 0
        const usedByUseless = Math.max(usedTotal - usedByUseful, 0)

        const remainingForUseless = TerminalOtherStuffStore - usedByUseless
        above = Math.max(remainingForUseless, 0)
      }

      if (above > 0) {
        const free = intentSolver.getFreeCapacity(structure, resourceType) || 0
        above = Math.min(free, above)
      }
    }
  }

  if (structureType === STRUCTURE_LINK) {
    if (!structure.__cook__cache__isSource) return 0
    return intentSolver.getFreeCapacity(structure, resourceType) || 0
  }

  return above
}

cook._hasSpace = function (structure, resourceType, forMining = false, forPlunder = false) {
  // save typing down the line
  if (structure === undefined) return false

  if (!structure.everWant(resourceType)) return false

  const lambda1 = () => this.___roomSpace(structure, resourceType, forMining, forPlunder)
  const lambda2 = () => this.___roomDemand(structure, resourceType)

  const space = (forMining || forPlunder) ? lambda1() : intentSolver.getWithIntentCache(structure, '__cook__hasSpace_' + resourceType, lambda1)
  const demand = intentSolver.getWithIntentCache(structure, '__cook__hasDemand_' + resourceType, lambda2)
  const eitherOr = Math.max(space, demand)
  const planned = this.___plannedDelta(structure, resourceType)

  return eitherOr > planned
}

cook._labClusterDemandTarget = function (room, resourceType) {
  for (const lab of room.labs.values()) {
    if (!lab.everWant(resourceType)) return [undefined, undefined]
    if (this._hasDemand(lab, resourceType)) return [lab, resourceType]
  }

  return [undefined, undefined]
}

cook.___addWorldDemand = function (structure, resourceType, amount) {
  if (!structure.isActiveSimple) return

  if (structure.__cook__worldDemandMap === undefined) {
    structure.__cook__worldDemandMap = new Map()
  }

  const now = structure.__cook__worldDemandMap.get(resourceType) || 0
  structure.__cook__worldDemandMap.set(resourceType, now + amount)
}

cook.___worldDemand = function (structure, resourceType) {
  if (!structure.isActiveSimple) return 0

  if (structure.__cook__worldDemandMap) {
    return structure.__cook__worldDemandMap.get(resourceType) || 0
  }

  return 0
}

cook.__worldDemandTypes = function (structure) {
  if (!structure.isActiveSimple) return []

  if (structure.__cook__worldDemandMap) {
    const types = []
    for (const [type, value] of structure.__cook__worldDemandMap) {
      if (value > 0) types.push(type)
    }
    return types
  }

  return []
}

cook.__processExtra = function (structure, creep, resourceTypeAndAmount) {
  const asWords = _.words(resourceTypeAndAmount)
  if (asWords.length !== 2) {
    console.log('Unexpected xtra for creep ' + creep + ' and ' + structure + ', whole, [' + resourceTypeAndAmount + ']')
    return [undefined, undefined]
  }

  const resourceType = asWords[0]
  if (!_.contains(RESOURCES_ALL, resourceType)) {
    console.log('Unexpected xtra for creep ' + creep + ' and ' + structure + ', resource type, [' + resourceTypeAndAmount + ']')
    return [undefined, undefined]
  }

  const resoureAmount = _.parseInt(asWords[1])
  if (_.isNaN(resoureAmount) || resoureAmount <= 0) {
    console.log('Unexpected xtra for creep ' + creep + ' and ' + structure + ', resource amount, [' + resourceTypeAndAmount + ']')
    return [undefined, undefined]
  }

  return [resourceType, resoureAmount]
}

cook._reserveFromStructureToCreep = function (structure, creep, resourceTypeAndAmount) {
  const [resourceType, resoureAmount] = this.__processExtra(structure, creep, resourceTypeAndAmount)
  if (resourceType === undefined || resoureAmount === undefined) {
    bootstrap.unassignCreep(creep)
    return
  }

  const freeSpace = intentSolver.getFreeCapacity(creep, resourceType) || 0
  if (freeSpace <= 0) return

  const actualAmount = Math.min(freeSpace, resoureAmount)

  this.__adjustPlannedDelta(structure, resourceType, -1 * actualAmount)
}

cook._expectFromCreepToStructure = function (structure, creep) {
  const all = intentSolver.getAllUsedCapacity(creep)
  for (const [resourceType, usedSpace] of all) {
    if (usedSpace <= 0) continue
    this.__adjustPlannedDelta(structure, resourceType, usedSpace)
  }
}

cook.__withdrawFromStructureToCreep = function (structure, creep, resourceTypeAndAmount) {
  const [resourceType, resoureAmount] = this.__processExtra(structure, creep, resourceTypeAndAmount)
  if (resourceType === undefined || resoureAmount === undefined) {
    bootstrap.unassignCreep(creep)
    return ERR_INVALID_ARGS
  }

  const canTake = intentSolver.getFreeCapacityMin(creep, resourceType) || 0
  if (canTake <= 0) return ERR_FULL

  const wantGive = this.___roomSupply(structure, resourceType)
  if (wantGive <= 0) return ERR_NOT_ENOUGH_RESOURCES

  const amount = Math.min(canTake, wantGive, resoureAmount)

  return this.wrapIntent(creep, 'withdraw', structure, resourceType, amount)
}

cook._controllerWithdrawFromStructureToCreep = function (structure, creep, resourceType) {
  const rc = this.__withdrawFromStructureToCreep(structure, creep, resourceType)
  // to avoid observe calls
  if (rc >= OK) {
    creep.__cook__withdrawOrTransfer = true
    return bootstrap.ERR_TERMINATED
  }

  return rc
}

cook.__transferFromCreepToStructure = function (structure, creep, resourceType) {
  // check first because dump mode
  if (!structure.everWant(resourceType)) return ERR_FULL
  const canTake1 = this.___roomSpace(structure, resourceType, undefined, creep.shortcut === 'plunder')
  const canTake2 = this.___roomDemand(structure, resourceType)
  const canTake = Math.max(canTake1, canTake2)
  if (canTake <= 0) return ERR_FULL

  const canGive = intentSolver.getUsedCapacityMin(creep, resourceType) || 0
  if (canGive <= 0) return ERR_NOT_ENOUGH_RESOURCES

  const amount = Math.min(canGive, canTake)

  return this.wrapIntent(creep, 'transfer', structure, resourceType, amount)
}

cook._controllerTransferFromCreepToStructure = function (structure, creep) {
  // by default, all is bad
  let rc = ERR_NOT_ENOUGH_RESOURCES

  for (const resourceType in creep.store) {
    // another pass in, maybe more to unload
    if (rc >= OK) return OK

    rc = this.__transferFromCreepToStructure(structure, creep, resourceType)

    if (rc >= OK) {
      creep.__cook__withdrawOrTransfer = true
    }
  }

  // single pass, release
  if (rc >= OK) {
    // to avoid observe calls
    return bootstrap.ERR_TERMINATED
  }
}

// << controller
cook.actRange = 1

cook._creepPerTarget = true

cook.validateTarget = undefined

cook.roomPrepare = function (room) {
  room.__cook__pass = 0

  room.__cook__structures = room.find(FIND_STRUCTURES)

  room.__cook__containers = _.filter(
    room.__cook__structures,
    structure => structure.structureType === STRUCTURE_CONTAINER
  )

  for (const lab of room.labs.values()) {
    lab.__cook__cache__isSource = lab.isSource()
    lab.__cook__cache__resourceType = lab.resourceType()
  }

  for (const link of room.links.values()) {
    link.__cook__cache__isSource = link.isSource()

    if (!link.__cook__cache__isSource) continue

    link.__cook__noEnergyRun = true

    for (const container of room.__cook__containers) {
      if (container.__cook__noEnergyRun) continue
      if (link.pos.isNearTo(container)) container.__cook__noEnergyRun = true
    }
  }
}

cook.observeMyCreep = function (creep) {
  const structure = bootstrap.getObjectById(creep.memory.dest)
  if (!structure) return

  if (creep.memory.xtra) {
    this._reserveFromStructureToCreep(structure, creep, creep.memory.xtra)
  } else {
    this._expectFromCreepToStructure(structure, creep)
  }
}

cook.act = function (structure, creep) {
  if (creep.memory.xtra) {
    return this._controllerWithdrawFromStructureToCreep(structure, creep, creep.memory.xtra)
  } else {
    return this._controllerTransferFromCreepToStructure(structure, creep)
  }
}

cook.onAssign = function (target, _creep) {
  if (target.room.__cook__energyRestockAssign) {
    target.__cook__hasEnergyDemand = false
  }

  if (target.__cook__resourceToTake !== undefined &&
      target.__cook__restockToTakeAmount !== undefined) {
    this.__adjustPlannedDelta(target, target.__cook__resourceToTake, -1 * target.__cook__restockToTakeAmount)
  }
}

cook.__hasEnergyDemand = function (structure) {
  if (structure.__cook__hasEnergyDemand !== undefined) {
    return structure.__cook__hasEnergyDemand
  }

  structure.__cook__hasEnergyDemand = this._hasDemand(structure, RESOURCE_ENERGY)
  return structure.__cook__hasEnergyDemand
}

cook._energyRestockPass1 = function (room, creeps) {
  if (creeps.length === 0) {
    return [[], []]
  }

  let unused
  let used

  if (room.energyAvailable < room.energyCapacityAvailable) {
    const prio1 = []

    for (const spawn of room.spawns.values()) {
      if (this.__hasEnergyDemand(spawn)) {
        prio1.push(spawn)
      }
    }

    // this is so numerous that any speedup helps
    for (const extension of room.extensions.values()) {
      if (extension.__cook__hasEnergyDemand === true) {
        prio1.push(extension)
        continue
      }

      if (extension.__cook__hasEnergyDemand === false) {
        continue
      }

      if (this.__hasEnergyDemand(extension)) {
        prio1.push(extension)
      }
    }

    if (prio1.length > 0) {
      const [prio1Unused, prio1Used] = this.assignCreeps(room, creeps, prio1)
      if (prio1Unused.length === 0) {
        return [prio1Unused, prio1Used]
      }

      unused = prio1Unused
      used = prio1Used
    } else {
      unused = creeps
      used = []
    }
  } else {
    unused = creeps
    used = []
  }

  if (unused.length > 0) {
    const prio2 = []

    for (const tower of room.towers.values()) {
      if (this.__hasEnergyDemand(tower)) {
        prio2.push(tower)
      }
    }

    if (prio2.length > 0) {
      const [prio2Unused, prio2Used] = this.assignCreeps(room, unused, prio2)
      return [prio2Unused, used.concat(prio2Used)]
    }
  }

  return [unused, used]
}

cook.__resourceRestockTargetForCreep = function (room, creep) {
  let resourceType
  const resourceTypes = _.shuffle(intentSolver.getUsedCapacityMinKeys(creep))
  for (const resourceType1 of resourceTypes) {
    if (resourceType1 === RESOURCE_ENERGY) continue
    resourceType = resourceType1
    break
  }

  if (resourceType === undefined) {
    return [undefined, undefined]
  }

  // keep in sync with "can handle" check to avoid lock on resources

  // purposeful
  if (this._hasDemand(room.powerSpawn, resourceType)) return [room.powerSpawn, resourceType]
  if (this._hasDemand(room.nuker, resourceType)) return [room.nuker, resourceType]
  const [someLab, someResourceType] = this._labClusterDemandTarget(room, resourceType)
  if (someLab !== undefined && someResourceType !== undefined) return [someLab, resourceType]
  if (this._hasDemand(room.terminal, resourceType)) return [room.terminal, resourceType]

  // just unload
  if (this._hasSpace(room.storage, resourceType)) return [room.storage, resourceType]
  if (this._hasSpace(room.factory, resourceType)) return [room.factory, resourceType]
  if (this._hasSpace(room.terminal, resourceType)) return [room.terminal, resourceType]

  return [undefined, undefined]
}

cook._resourceRestock = function (room, creeps) {
  if (creeps.length === 0) {
    return [[], []]
  }

  if (!room._my_) {
    return [creeps, []]
  }

  const unused = []
  const used = []

  for (const creep of creeps) {
    const [target, resourceType] = this.__resourceRestockTargetForCreep(room, creep)
    if (target) {
      bootstrap.assignCreep(this, target, undefined, creep)
      // since non-"matrix" assignment is used, force _hasDemand to false
      this.__adjustPlannedDelta(target, resourceType, MadeUpLargeNumber)
      used.push(creep)
    } else {
      unused.push(creep)
    }
  }

  return [unused, used]
}

cook._controlPass1 = function (room, creeps) {
  // qualify

  const withEnergy = []
  const withResources = []

  for (const creep of creeps) {
    const all = intentSolver.getAllUsedCapacity(creep)
    const total = all.get('total') || 0

    if (total <= 0) {
      continue
    }

    const energy = all.get(RESOURCE_ENERGY) || 0

    if (energy > 0) {
      creep.__cook__pass1__energy = true
      withEnergy.push(creep)
    }

    if (energy < total) withResources.push(creep)
  }

  // unload

  if (_.some(withEnergy, 'memory.atds')) {
    this.validateTarget = this._validateTarget
  } else {
    this.validateTarget = undefined
  }
  room.__cook__energyRestockAssign = true
  // eslint-disable-next-line no-unused-vars
  const [energyUnused, energyUsed] = this._energyRestockPass1(room, withEnergy)
  room.__cook__energyRestockAssign = undefined
  for (const creep of energyUsed) {
    creep.__cook__pass1__used = true
  }

  const withResourceNotTaken = []
  for (const creep of withResources) {
    if (creep.__cook__pass1__used) continue
    withResourceNotTaken.push(creep)
  }

  if (_.some(withResourceNotTaken, 'memory.atds')) {
    this.validateTarget = this._validateTarget
  } else {
    this.validateTarget = undefined
  }
  const [resourceUnused, resourceUsed] = this._resourceRestock(room, withResourceNotTaken)
  this.validateTarget = undefined
  for (const creep of resourceUsed) {
    creep.__cook__pass1__used = true
  }

  for (const creep of resourceUnused) {
    // because drop has priority
    if (creep.__cook__withdrawOrTransfer) continue
    if (creep.__grab__withdrawOrPickup) continue

    const resourceType = _.sample(intentSolver.getUsedCapacityMinKeys(creep))
    if (resourceType === undefined) continue
    if (resourceType === RESOURCE_ENERGY) continue
    this.wrapIntent(creep, 'drop', resourceType)
  }

  const unused = []
  const used = []
  let hasUnusedWorkerWithEnergy = false

  for (const creep of creeps) {
    if (creep.__cook__pass1__used) {
      used.push(creep)
    } else {
      unused.push(creep)

      // STRATEGY trap only when there is no other workers with energy
      if (creep.__cook__pass1__energy && creep.memory.btyp === 'worker') {
        hasUnusedWorkerWithEnergy = true
      }
    }
  }

  // assign energy traps to workers
  if (!hasUnusedWorkerWithEnergy) {
    for (const creep of unused) {
      if (creep.memory.btyp === 'worker') {
        creep._trap_ = RESOURCE_ENERGY
      }
    }
  }

  return [unused, used]
}

cook.__hasPrio1And2EnergyRestockTargets = function (room) {
  if (room.energyAvailable < room.energyCapacityAvailable) {
    for (const spawn of room.spawns.values()) {
      if (this.__hasEnergyDemand(spawn)) return true
    }

    // this is so numerous that any speedup helps
    for (const extension of room.extensions.values()) {
      if (extension.__cook__hasEnergyDemand === true) return true
      if (extension.__cook__hasEnergyDemand === false) continue
      if (this.__hasEnergyDemand(extension)) return true
    }
  }

  for (const tower of room.towers.values()) {
    if (this.__hasEnergyDemand(tower)) return true
  }

  return false
}

cook.___filterOutUnderRamparts = function (room, structures) {
  if (room.__cook__ramparts === undefined) {
    room.__cook__ramparts = _.filter(
      room.__cook__structures,
      structure => structure.structureType === STRUCTURE_RAMPART && !structure.isPublic
    )
  }

  return _.filter(
    structures,
    structure => {
      return !_.some(
        room.__cook__ramparts,
        rampart => rampart.pos.x === structure.pos.x && rampart.pos.y === structure.pos.y
      )
    }
  )
}

cook.__energyRestockSources = function (room) {
  if (room.__cook__energyRestockSources) {
    return room.__cook__energyRestockSources
  }

  let sources = []

  for (const container of room.__cook__containers) {
    if (this.__hasSupply(container, RESOURCE_ENERGY)) {
      sources.push(container)
      if (container.__cook__noEnergyRun) room.__cook__hasNoEnergyRun = true
    }
  }

  if (this.__hasSupply(room.factory, RESOURCE_ENERGY)) sources.push(room.factory)

  for (const link of room.links.values()) {
    if (this.__hasSupply(link, RESOURCE_ENERGY)) {
      sources.push(link)
      if (link.__cook__noEnergyRun) room.__cook__hasNoEnergyRun = true
    }
  }

  if (this.__hasSupply(room.storage, RESOURCE_ENERGY)) sources.push(room.storage)
  if (this.__hasSupply(room.terminal, RESOURCE_ENERGY)) sources.push(room.terminal)

  if (!room._my_ && room.controller && room.controller.owner) {
    sources = this.___filterOutUnderRamparts(room, sources)
  }

  for (const source of sources) {
    source.__cook__resourceToTake = RESOURCE_ENERGY
    source.__cook__restockToTakeAmount = MadeUpLargeNumber
  }

  room.__cook__energyRestockSources = sources
  return sources
}

cook.___roomNeedResource = function (room, resourceType, referenceLab = undefined) {
  if (room.__cook__roomNeedResourceMap === undefined) {
    room.__cook__roomNeedResourceMap = new Map()
  }

  const cached = room.__cook__roomNeedResourceMap.get(resourceType)
  if (cached !== undefined) return cached

  const withCache = (x, key, value) => {
    x.__cook__roomNeedResourceMap.set(key, value)
    return value
  }

  if (room.factory && room.factory.everWant(resourceType)) {
    const demand = this.___roomDemand(room.factory, resourceType)
    if (demand > 0) return withCache(room, resourceType, demand)
  }

  for (const lab of room.labs.values()) {
    if (!lab.everWant(resourceType)) break

    // explicitly prevent labs from cross-demand-supplying
    if (referenceLab) {
      if (lab.__cook__cache__resourceType === referenceLab.__cook__cache__resourceType) continue
    }

    const demand = this.___roomDemand(lab, resourceType)
    if (demand > 0) return withCache(room, resourceType, demand)
  }

  if (room.nuker && room.nuker.everWant(resourceType)) {
    const demand = this.___roomDemand(room.nuker, resourceType)
    if (demand > 0) return withCache(room, resourceType, demand)
  }

  if (room.powerSpawn && room.powerSpawn.everWant(resourceType)) {
    const demand = this.___roomDemand(room.powerSpawn, resourceType)
    if (demand > 0) return withCache(room, resourceType, demand)
  }

  if (room.storage && room.storage.everWant(resourceType)) {
    const demand = this.___roomDemand(room.storage, resourceType)
    if (demand > 0) return withCache(room, resourceType, demand)
  }

  if (room.terminal && room.terminal.everWant(resourceType)) {
    const demand = this.___roomDemand(room.terminal, resourceType)
    if (demand > 0) return withCache(room, resourceType, demand)
  }

  return withCache(room, resourceType, 0)
}

cook.__resourceRestockSources = function (room, count) {
  if (!room._my_ || count === 0) return []

  const sources = []

  const pushStore = structure => {
    if (structure === undefined) return false

    let referenceLab
    if (structure.structureType === STRUCTURE_LAB) referenceLab = structure

    const stored = intentSolver.getUsedCapacityMinKeys(structure)
    for (const resourceType of stored) {
      if (resourceType === RESOURCE_ENERGY) continue

      if (!this.__hasSupply(structure, resourceType)) continue

      const roomDemand = this.___roomNeedResource(room, resourceType, referenceLab)
      if (roomDemand > 0) {
        structure.__cook__resourceToTake = resourceType
        structure.__cook__restockToTakeAmount = roomDemand
        return true
      }
    }

    return false
  }

  if (pushStore(room.factory)) sources.push(room.factory)
  if (sources.length >= count) return sources

  for (const lab of room.labs.values()) {
    if (pushStore(lab)) {
      sources.push(lab)
      if (sources.length >= count) return sources
    }
  }

  if (pushStore(room.storage)) sources.push(room.storage)
  if (sources.length >= count) return sources

  if (pushStore(room.terminal)) sources.push(room.terminal)
  if (sources.length >= count) return sources

  // check flush space by king of greed resources
  if (!this._hasSpace(room.terminal, RESOURCE_POWER)) return sources

  const flushStore = structure => {
    if (structure === undefined) return false

    const flushType = this.___hasFlush(structure)
    if (flushType) {
      structure.__cook__resourceToTake = flushType
      structure.__cook__restockToTakeAmount = MadeUpLargeNumber
      return true
    }

    return false
  }

  for (const container of room.__cook__containers) {
    if (flushStore(container)) {
      sources.push(container)
      if (sources.length >= count) return sources
    }
  }

  if (flushStore(room.factory)) sources.push(room.factory)
  if (sources.length >= count) return sources

  for (const lab of room.labs.values()) {
    if (flushStore(lab)) {
      sources.push(lab)
      if (sources.length >= count) return sources
    }
  }

  if (flushStore(room.storage)) sources.push(room.storage)

  return sources
}

cook.__prio3EnergyRestockTargets = function (room, count) {
  if (count === 0) return []

  const targets = []

  const isAndHasEnergyDemand = structure => {
    if (structure === undefined) return false
    return this.__hasEnergyDemand(structure)
  }

  if (isAndHasEnergyDemand(room.terminal)) targets.push(room.terminal)
  if (targets.length >= count) return targets

  for (const lab of room.labs.values()) {
    if (this.__hasEnergyDemand(lab)) {
      targets.push(lab)
      if (targets.length >= count) return targets
    }
  }

  if (isAndHasEnergyDemand(room.nuker)) targets.push(room.nuker)
  if (targets.length >= count) return targets

  if (isAndHasEnergyDemand(room.powerSpawn)) targets.push(room.powerSpawn)
  if (targets.length >= count) return targets

  if (isAndHasEnergyDemand(room.factory)) targets.push(room.factory)
  // if (targets.length >= count) return targets

  // ^ unpack later if needed v
  // if (isAndHasEnergyDemand(room.storage)) targets.push(room.storage)

  return targets
}

cook.__plunderEnergyDropTargets = function (room) {
  const isAndHasEnergySpace = structure => {
    if (structure === undefined) return false
    return this._hasSpace(structure, RESOURCE_ENERGY, undefined, true)
  }

  if (isAndHasEnergySpace(room.terminal)) return [room.terminal]
  if (isAndHasEnergySpace(room.storage)) return [room.storage]

  return []
}

cook.extra = function (target) {
  if (target.__cook__resourceToTake !== undefined &&
      target.__cook__restockToTakeAmount !== undefined) {
    return target.__cook__resourceToTake + ':' + target.__cook__restockToTakeAmount
  }

  return undefined
}

cook.__untrap = function (room, creeps) {
  room.traps = []
  for (const creep of creeps) {
    creep._was_trap_ = undefined
    creep._trap_ = undefined
  }
}

const Close2 = (a, b) => {
  const dx = Math.abs(a.x - b.x)
  if (dx > 2) return false
  const dy = Math.abs(a.y - b.y)
  return dy <= 2
}

const HowFarToGoForEnergy = 10

cook.__checkNoRun = function (_allTargets, target, creep) {
  if (!target.__cook__noEnergyRun) return true
  // strict
  // return target.pos.isNearTo(creep)

  // relaxed
  const dx = Math.abs(target.pos.x - creep.pos.x)
  if (dx > HowFarToGoForEnergy) return false

  const dy = Math.abs(target.pos.y - creep.pos.y)
  return dy <= HowFarToGoForEnergy
}

cook.__checkNoRunAndDefault = function (allTargets, target, creep) {
  return this.__checkNoRun(allTargets, target, creep) && this._validateTarget(allTargets, target, creep)
}

cook.__harvestersPass2 = function (room, harvesters) {
  if (room._actType_ === bootstrap.RoomActTypeMy && room.links && room.links.size > 0) {
    // transfer energy reserves from containers to links
    for (const link of room.links.values()) {
      if (!link.__cook__cache__isSource) continue
      // for uniformity
      if (!this._hasSpace(link, RESOURCE_ENERGY)) continue

      const canTake = intentSolver.getFreeCapacityMin(link, RESOURCE_ENERGY) || 0
      if (canTake <= 0) continue

      let foundHarvester = false
      for (const harvester of harvesters) {
        if (!harvester.pos.isNearTo(link)) continue

        const canGive = intentSolver.getUsedCapacityMin(harvester, RESOURCE_ENERGY) || 0
        if (canGive > 0) {
          const amount = Math.min(canTake, canGive)
          const rc = this.wrapIntent(harvester, 'transfer', link, RESOURCE_ENERGY, amount)
          if (rc >= OK) {
            harvester.__cook__pass2__used = true
            foundHarvester = true
            break // from harvesters loop
          }
        } else {
          for (const container of room.__cook__containers) {
            if (!harvester.pos.isNearTo(container)) continue
            if (!this.__hasSupply(container, RESOURCE_ENERGY)) continue

            const rc1 = this.wrapIntent(harvester, 'withdraw', container, RESOURCE_ENERGY)
            if (rc1 >= OK) {
              harvester.__cook__pass2__used = true
              foundHarvester = true
              break // from containers loop
            }
          }

          if (harvester.__cook__pass2__used === true) break // from harvesters loop
        }
      }

      if (foundHarvester === false) {
        for (const harvester of harvesters) {
          if (harvester.memory.sptx === undefined && harvester.memory.spty === undefined && Close2(harvester.pos, link.pos) && harvester.memory._est) {
            const source = bootstrap.getObjectById(harvester.memory._est)
            if (source && Close2(source.pos, link.pos)) {
              const direction = harvester.pos.getDirectionTo(link.pos)
              const rc = harvester.moveWrapper(direction, { jiggle: true })
              if (rc >= OK) {
                harvester.__cook__pass2__used = true
                foundHarvester = true
                break // from harvesters loop
              }
            }
          }
        }
      }
    }
  }

  for (const harvester of harvesters) {
    if (harvester.__cook__pass2__used) continue

    const canGive = intentSolver.getUsedCapacityMin(harvester, RESOURCE_ENERGY) || 0
    if (canGive > 0) {
      for (const container of room.__cook__containers) {
        if (!container.isSource()) continue
        if (!harvester.pos.isNearTo(container)) continue

        const canTake = intentSolver.getFreeCapacityMin(container, RESOURCE_ENERGY) || 0
        if (canTake > 0) {
          const amount = Math.min(canGive, canTake)
          const rc = this.wrapIntent(harvester, 'transfer', container, RESOURCE_ENERGY, amount)
          if (rc >= OK) {
            harvester.__cook__pass2__used = true
            break // from containers loop
          }
        }
      }
    }
  }
}

cook.__upgradersPass2 = function (room, upgraders) {
  const transports = []

  for (const upgrader of upgraders) {
    if (this._hasEnergy(upgrader)) continue
    transports.push(upgrader)
  }

  if (transports.length === 0) return

  const energyRestockSources = this.__energyRestockSources(room)
  if (energyRestockSources.length === 0) return

  if (room.__cook__hasNoEnergyRun) {
    this.validateTarget = this.__checkNoRunAndDefault
  } else {
    this.validateTarget = this._validateTarget
  }
  // eslint-disable-next-line no-unused-vars
  const [unused, used] = this.assignCreeps(room, transports, energyRestockSources)
  this.validateTarget = undefined

  for (const creep of used) {
    creep.__cook__pass2__used = true
  }
}

cook._controlPass2 = function (room, creeps) {
  const harvesters = []
  const upgraders = []
  const others = []

  for (const creep of creeps) {
    const bodyType = creep.memory.btyp

    if (bodyType === 'harvester') {
      harvesters.push(creep)
      continue
    }

    if (bodyType === 'upgrader') {
      upgraders.push(creep)
      continue
    }

    others.push(creep)
  }

  if (harvesters.length > 0) {
    this.__harvestersPass2(room, harvesters)
  }

  if (upgraders.length > 0) {
    this.__upgradersPass2(room, upgraders)
  }

  const roomHasEnergyTrap = _.some(room.traps, _.matches(RESOURCE_ENERGY))
  const roomHasPrioEnergyDemand = this.__hasPrio1And2EnergyRestockTargets(room)

  if (roomHasEnergyTrap || roomHasPrioEnergyDemand) {
    const transports = []
    for (const creep of others) {
      if (roomHasEnergyTrap && creep._was_trap_ === RESOURCE_ENERGY) {
        transports.push(creep)
        continue
      }

      if (roomHasPrioEnergyDemand && this._hasCM(creep) && this._hasFreeCapacity(creep)) {
        transports.push(creep)
      }
    }

    this.__untrap(room, creeps)

    if (transports.length > 0) {
      const energyRestockSources = this.__energyRestockSources(room)
      if (energyRestockSources.length > 0) {
        if (room.__cook__hasNoEnergyRun) {
          this.validateTarget = this.__checkNoRun
        } else {
          this.validateTarget = undefined
        }
        // eslint-disable-next-line no-unused-vars
        const [unused, used] = this.assignCreeps(room, transports, energyRestockSources)
        this.validateTarget = undefined

        for (const creep of used) {
          creep.__cook__pass2__used = true
        }
      }
    }
  } else {
    // otherwise chase ghosths
    this.__untrap(room, creeps)

    const withEnergy = []
    for (const creep of others) {
      if (this._hasCM(creep) && this._hasEnergy(creep)) {
        withEnergy.push(creep)
      }
    }

    let restockedPrio3 = false
    if (withEnergy.length > 0) {
      const prio3EnergyRestockTargets = this.__prio3EnergyRestockTargets(room, withEnergy.length)
      if (prio3EnergyRestockTargets.length > 0) {
        if (_.some(withEnergy, 'memory.atds')) {
          this.validateTarget = this._validateTarget
        } else {
          this.validateTarget = undefined
        }
        this.__cook__energyRestockAssign = true
        // eslint-disable-next-line no-unused-vars
        const [unused, used] = this.assignCreeps(room, withEnergy, prio3EnergyRestockTargets)
        this.validateTarget = undefined
        this.__cook__energyRestockAssign = undefined

        for (const creep of used) {
          creep.__cook__pass2__used = true
        }

        restockedPrio3 = used.length > 0
      }

      const stuckPlunders = []
      for (const creep of withEnergy) {
        if (creep.__cook__pass2__used) continue
        if (creep.shortcut === 'plunder') {
          stuckPlunders.push(creep)
        }
      }

      if (stuckPlunders.length > 0) {
        const energyDumpds = this.__plunderEnergyDropTargets(room)
        if (energyDumpds.length > 0) {
          this.__cook__energyRestockAssign = true
          // eslint-disable-next-line no-unused-vars
          const [unused, used] = this.assignCreeps(room, stuckPlunders, energyDumpds)
          this.__cook__energyRestockAssign = undefined

          for (const creep of used) {
            creep.__cook__pass2__used = true
          }
        }
      }
    }

    let transports = []
    for (const creep of others) {
      if (creep.__cook__pass2__used) continue

      if (this._hasCM(creep) && this._hasFreeCapacity(creep)) {
        transports.push(creep)
      }
    }

    // restock resources
    if (transports.length > 0) {
      const resourceRestockSources = this.__resourceRestockSources(room, transports.length)
      if (resourceRestockSources.length > 0) {
        const [unused, used] = this.assignCreeps(room, transports, resourceRestockSources)
        for (const creep of used) {
          creep.__cook__pass2__used = true
        }
        transports = unused
      }
    }

    // restock low priority energy demands
    if (!restockedPrio3 && transports.length > 0) {
      const energyRestockSources = this.__energyRestockSources(room)
      if (energyRestockSources.length > 0) {
        const prio3EnergyRestockTargets = this.__prio3EnergyRestockTargets(room, transports.length)
        if (prio3EnergyRestockTargets.length > 0) {
          // targets no longer than transports by call agreement
          // limit business to necessary only
          transports = _.sample(transports, prio3EnergyRestockTargets.length)
          if (room.__cook__hasNoEnergyRun) {
            this.validateTarget = this.__checkNoRun
          } else {
            this.validateTarget = undefined
          }
          // eslint-disable-next-line no-unused-vars
          const [unused, used] = this.assignCreeps(room, transports, energyRestockSources)
          this.validateTarget = undefined

          for (const creep of used) {
            creep.__cook__pass2__used = true
          }
        }
      }
    }

    if ((room.memory.ulvl || 0) <= 0) {
      const lowkeyUpgraders = []

      for (const creep of others) {
        if (creep.__cook__pass2__used) continue
        if (creep.memory.btyp !== 'worker') continue
        if (this._hasEnergy(creep)) continue
        if (this._hasCM(creep)) lowkeyUpgraders.push(creep)
      }

      if (lowkeyUpgraders.length > 0) {
        const energyRestockSources = this.__energyRestockSources(room)
        if (energyRestockSources.length > 0) {
          if (room.__cook__hasNoEnergyRun) {
            this.validateTarget = this.__checkNoRun
          } else {
            this.validateTarget = undefined
          }
          // eslint-disable-next-line no-unused-vars
          const [unused, used] = this.assignCreeps(room, lowkeyUpgraders, energyRestockSources)
          this.validateTarget = undefined

          for (const creep of used) {
            creep.__cook__pass2__used = true
          }
        }
      }
    }
  }

  // summarize
  const unused = []
  const used = []
  for (const creep of creeps) {
    if (creep.__cook__pass2__used) {
      used.push(creep)
    } else {
      unused.push(creep)
    }
  }

  return [unused, used]
}

cook.control = function (room, creeps) {
  ++room.__cook__pass

  if (room.__cook__pass === 1) return this._controlPass1(room, creeps)
  if (room.__cook__pass === 2) return this._controlPass2(room, creeps)

  console.log('Unexpected call to cook::control for room [' + room.name + '] with pass [' + room.__cook__pass + ']')
  return [creeps, []]
}
// >>

cook.roomCanHandle = function (room, resourceType) {
  if (resourceType === RESOURCE_ENERGY) return true

  if (!room._my_) return false

  if (room.__cook__roomCanHandle === undefined) {
    room.__cook__roomCanHandle = new Map()
  }

  const cached = room.__cook__roomCanHandle.get(resourceType)
  if (cached !== undefined) return cached

  const withCache = (x, key, value) => {
    x.__cook__roomCanHandle.set(key, value)
    return value
  }

  // in order of likelihood of having space for random resource
  // some are on-demand, some are showe-in

  // has space for "stuff"
  if (this._hasSpace(room.terminal, resourceType)) return withCache(room, resourceType, true)

  // for reagents lost in transport
  const [someLab, someResourceType] = this._labClusterDemandTarget(room, resourceType)
  if (someLab !== undefined && someResourceType !== undefined) {
    return withCache(room, resourceType, true)
  }

  // for ghodium lost in transport
  if (this._hasDemand(room.nuker, resourceType)) return withCache(room, resourceType, true)

  // for "shiny" things only
  if (this._hasSpace(room.storage, resourceType)) return withCache(room, resourceType, true)

  // for power lost in transport
  if (this._hasDemand(room.powerSpawn, resourceType)) return withCache(room, resourceType, true)

  // if somehow packed resources of interest
  if (this._hasSpace(room.factory, resourceType)) return withCache(room, resourceType, true)

  return withCache(room, resourceType, false)
}

cook.roomCanMine = function (room) {
  if (!room._my_) {
    console.log('Unexpected call to cook::roomCanMine for room [' + room.name + '] => false')
    return false
  }

  // STRATEGY no mining if no terminal
  if (room.terminal === undefined) return false

  const mineralType = room.mineralType()
  if (mineralType === '') return false

  // special flag that do not allow for "sell off" excess
  if (this._hasSpace(room.terminal, mineralType, true)) return true

  const [someLab, someResourceType] = this._labClusterDemandTarget(room, mineralType)
  return someLab !== undefined && someResourceType !== undefined
}

cook.___resetRoomRecepie = function (room) {
  room.setLabRecepie('1', undefined, undefined, undefined, true)
  room.setLabRecepie('2', undefined, undefined, undefined, true)
  room.setLabRecepie('3', undefined, undefined, undefined, true)
  room.setLabRecepie('4', undefined, undefined, undefined, true)
  room.setLabRecepie('5', undefined, undefined, undefined, true)
  room.setLabRecepie('6', undefined, undefined, undefined, true)
  room.setLabRecepie('7', undefined, undefined, undefined, true)
  room.setLabRecepie('8', undefined, undefined, undefined, true)
  room.setLabRecepie('9', undefined, undefined, undefined, true)
  room.setLabRecepie('A', undefined, undefined, undefined, true)
}

// input order is not important, just used to amortise checks

cook.___setRoomRecepieNuke = function (room) {
  room.setLabRecepie('1', true, RESOURCE_ZYNTHIUM)
  room.setLabRecepie('3', true, RESOURCE_KEANIUM)
  room.setLabRecepie('5', undefined, RESOURCE_ZYNTHIUM_KEANITE, '1,3')
  room.setLabRecepie('7', undefined, RESOURCE_ZYNTHIUM_KEANITE, '3,1')

  room.setLabRecepie('2', true, RESOURCE_UTRIUM)
  room.setLabRecepie('4', true, RESOURCE_LEMERGIUM)
  room.setLabRecepie('6', undefined, RESOURCE_UTRIUM_LEMERGITE, '2,4')
  room.setLabRecepie('8', undefined, RESOURCE_UTRIUM_LEMERGITE, '4,2')

  room.setLabRecepie('9', false, RESOURCE_GHODIUM, '5,6,7,8')
  room.setLabRecepie('A', false, RESOURCE_GHODIUM, '8,7,6,5')
}

cook.___setRoomRecepieWallup = function (room) {
  // demand + no supply, XLH2O, (no inputs)
  room.setLabRecepie('1', true, RESOURCE_CATALYZED_LEMERGIUM_ACID)
  if (room.labs.size < 2) return

  // demand + no supply, XLH2O, (no inputs)
  room.setLabRecepie('2', true, RESOURCE_CATALYZED_LEMERGIUM_ACID)
  if (room.labs.size < 10) return

  // no demand + supply, XLH2O, from 3 and 4
  room.setLabRecepie('1', false, RESOURCE_CATALYZED_LEMERGIUM_ACID, '3,4')
  room.setLabRecepie('2', false, RESOURCE_CATALYZED_LEMERGIUM_ACID, '4,3')

  // demand + no supply, basic reagents, (no input)
  room.setLabRecepie('3', true, RESOURCE_CATALYST)
  room.setLabRecepie('7', true, RESOURCE_LEMERGIUM)
  room.setLabRecepie('8', true, RESOURCE_OXYGEN)
  room.setLabRecepie('9', true, RESOURCE_HYDROGEN)
  room.setLabRecepie('A', true, RESOURCE_HYDROGEN)

  // internal processing as needed, intermediate reagents, from previous steps
  room.setLabRecepie('4', undefined, RESOURCE_LEMERGIUM_ACID, '5,6')
  room.setLabRecepie('5', undefined, RESOURCE_LEMERGIUM_HYDRIDE, '7,9')
  room.setLabRecepie('6', undefined, RESOURCE_HYDROXIDE, '8,A')
}

cook.__updateRoomRecepie = function (room) {
  if (room.labs.size === 10 && this._hasDemand(room.nuker, RESOURCE_GHODIUM)) {
    this.___setRoomRecepieNuke(room)
    return
  }

  if (Game.flags['wallup_' + room.name]) {
    this.___setRoomRecepieWallup(room)
    return
  }

  this.___resetRoomRecepie(room)
}

cook._updateRoomRecepie = function (room) {
  if (!room._my_) return
  if (room.labs.size === 0) return

  const processKey = (room.memory.intl + Game.time) % CREEP_LIFE_TIME
  if (processKey === 0) {
    this.__updateRoomRecepie(room)
  }
}

cook._setWorldDemand = function (room) {
  if (!room._my_) return
  if (!room.terminal) return

  const sourceLevel = room.memory.slvl || 0
  if (room._fight_ || sourceLevel < 2) {
    const now = intentSolver.getUsedCapacity(room.terminal, RESOURCE_ENERGY)
    const ideal = TerminalEnergyDemand + SOURCE_ENERGY_CAPACITY
    if (now < ideal) {
      const delta = ideal - now
      // slow down jiggling
      if (delta >= SOURCE_ENERGY_CAPACITY * 2 / 3) {
        this.___addWorldDemand(room.terminal, RESOURCE_ENERGY, ideal - now)
      }
    } else {
      // mark as not ready to give energy
      this.___addWorldDemand(room.terminal, RESOURCE_ENERGY, -1)
    }
  }

  const mineralType = room.mineralType()
  const lambda = (resourceType, factor = 1) => {
    // demand and hold only foreign resources
    if (resourceType !== mineralType) {
      if (this.__hasSupply(room.terminal, resourceType)) {
        // mark as not ready to give this resource
        this.___addWorldDemand(room.terminal, resourceType, -1)
      } else {
        this.___addWorldDemand(room.terminal, resourceType, factor * 1000)
      }
    }
  }

  if (this._hasDemand(room.nuker, RESOURCE_GHODIUM)) {
    if (room.labs.size === 10) {
      lambda(RESOURCE_ZYNTHIUM)
      lambda(RESOURCE_KEANIUM)
      lambda(RESOURCE_UTRIUM)
      lambda(RESOURCE_LEMERGIUM)
      lambda(RESOURCE_UTRIUM_LEMERGITE)
      lambda(RESOURCE_ZYNTHIUM_KEANITE)
    }

    lambda(RESOURCE_GHODIUM)
  }

  if (Game.flags['wallup_' + room.name]) {
    if (room.labs.size === 10) {
      lambda(RESOURCE_LEMERGIUM)
      lambda(RESOURCE_CATALYST)
      lambda(RESOURCE_HYDROGEN, 2)
      lambda(RESOURCE_OXYGEN)
      lambda(RESOURCE_HYDROXIDE)
      lambda(RESOURCE_LEMERGIUM_HYDRIDE)
      lambda(RESOURCE_LEMERGIUM_ACID)
    }

    lambda(RESOURCE_CATALYZED_LEMERGIUM_ACID)
  }
}

// to save on require call
const DummyRepairController = {
  id: 'repair',
  actRange: 3
}

const NotMaxHits = structure => structure.hits < structure.hitsMax

cook._unloadActiveHarvesters = function (room) {
  const roomCreeps = room.getRoomControlledCreeps()

  const harvesters = _.filter(
    roomCreeps,
    creep => {
      if (creep.__cook__pass2__used) return false
      if (creep._source_harvest_specialist_rc_ === OK) return false
      if (creep._source_ === undefined) return false
      if (creep.memory.atds !== true) return false
      if (creep.memory.btyp !== 'harvester') return false

      return creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0
    }
  )

  if (harvesters.length === 0) return

  const containers = room.__cook__containers
  const links = Array.from(room.links.values())

  if (containers.length === 0 && links.length === 0) return

  const terrain = new Room.Terrain(room.name)
  const calculateHarvestSpotBetween = (some1, some2) => {
    const dx = some2.pos.x - some1.pos.x
    const dy = some2.pos.y - some1.pos.y
    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)
    const evenDx = absDx % 2 === 0
    const evenDy = absDy % 2 === 0

    if (evenDx && evenDy) {
      return new RoomPosition(some1.pos.x + (dx / 2), some1.pos.y + (dy / 2), room.name)
    }

    if (evenDx) {
      const x = some1.pos + (dx / 2)
      const y1 = some1.pos.y
      const y2 = some2.pos.y

      if (terrain.get(x, y1) !== TERRAIN_MASK_WALL) {
        return new RoomPosition(x, y1, room.name)
      }

      if (terrain.get(x, y2) !== TERRAIN_MASK_WALL) {
        return new RoomPosition(x, y2, room.name)
      }
    }

    if (evenDy) {
      const y = some1.pos + (dy / 2)
      const x1 = some1.pos.x
      const x2 = some2.pos.x

      if (terrain.get(x1, y) !== TERRAIN_MASK_WALL) {
        return new RoomPosition(x1, y, room.name)
      }

      if (terrain.get(x2, y) !== TERRAIN_MASK_WALL) {
        return new RoomPosition(x2, y, room.name)
      }
    }

    console.log('Could not find harvest spot for [' + some1.pos + '] and [' + some2.pos + ']')

    return undefined
  }

  for (const harvester of harvesters) {
    let clusterContainers = _.filter(containers, container => container.pos.isNearTo(harvester._source_))
    for (const container of clusterContainers) {
      if (NotMaxHits(container)) {
        bootstrap.assignCreep(DummyRepairController, container, undefined, harvester)
        continue
      }
    }

    let clusterLinks = _.filter(links, link => Close2(link.pos, harvester._source_.pos))

    if (clusterContainers.length === 0 && clusterLinks.length === 0) continue

    let harvestSpot

    if (harvester.memory.sptx !== undefined && harvester.memory.spty !== undefined) {
      harvestSpot = new RoomPosition(harvester.memory.sptx, harvester.memory.spty, room.name)
    }

    if (harvestSpot === undefined && clusterLinks.length > 0) {
      if (clusterLinks.length > 1) {
        clusterLinks = _.sortBy(clusterLinks, 'id')
      }

      const link = clusterLinks[0]
      harvestSpot = calculateHarvestSpotBetween(harvester._source_, link)
    }

    if (harvestSpot === undefined && clusterContainers.length > 0) {
      clusterContainers = _.sortByAll(
        clusterContainers,
        container => {
          const absDx = Math.abs(container.pos.x - harvester._source_.pos.x)
          const absDy = Math.abs(container.pos.y - harvester._source_.pos.y)
          return absDx + absDy
        },
        'id'
      )

      harvestSpot = clusterContainers[0].pos
    }

    if (harvestSpot) {
      harvester.memory.sptx = harvestSpot.x
      harvester.memory.spty = harvestSpot.y

      if (harvestSpot.x !== harvester.pos.x || harvestSpot.y !== harvester.pos.y) {
        const direction = harvester.pos.getDirectionTo(harvestSpot)
        harvester.moveWrapper(direction, { jiggle: true })
      }
    }

    let transferredToLink = false
    for (const link of clusterLinks) {
      const rc = this.__transferFromCreepToStructure(link, harvester, RESOURCE_ENERGY)
      if (rc >= OK) {
        transferredToLink = true
        break // from links loop
      }
    }
    if (transferredToLink) continue // to next harvester

    if (room._actType_ === bootstrap.RoomActTypeMy && clusterLinks.size > 0) {
      // unload to containers only when there is more energy in source
      // this is to reduce withdrawing from containers to links on way back
      const rc = harvester._source_harvest_specialist_rc_
      if (rc === bootstrap.WARN_BOTH_EXHAUSED) continue
      if (rc === bootstrap.WARN_INTENDED_EXHAUSTED) continue
      if (rc === bootstrap.ERR_INTENDED_EXHAUSTED) continue
      if (rc === ERR_NOT_ENOUGH_RESOURCES) continue
    }

    for (const container of clusterContainers) {
      const rc = this.__transferFromCreepToStructure(container, harvester, RESOURCE_ENERGY)
      if (rc >= OK) {
        break // from containers loop
      }
    }
  } // harvesters
}

cook._operateLinks = function (room) {
  if (!room._my_) return

  const allLinks = _.filter(Array.from(room.links.values()), _.property('isActiveSimple'))

  if (allLinks.length === 0) {
    return
  }

  const sources = []
  const destinations = []

  const useAsSource = someLink => {
    if (someLink.cooldown && someLink.cooldown > 0) return false
    const energy = intentSolver.getUsedCapacityMin(someLink, RESOURCE_ENERGY) || 0

    const plannedDelta = this.___plannedDelta(someLink, RESOURCE_ENERGY)

    const freeEnergy = plannedDelta > 0 ? energy : (energy + plannedDelta)

    someLink.__cook__freeEnergy = freeEnergy

    // to avoid frantic sends
    return freeEnergy >= LinkSourceTreshold
  }

  const useAsDest = someLink => {
    const free = intentSolver.getFreeCapacityMin(someLink, RESOURCE_ENERGY)

    // cut off transfer, due to losses it is never 100% full
    return free >= LinkDestinationTreshold
  }

  for (const link of allLinks) {
    // quick flag, source keeps to be source
    if (link.__cook__cache__isSource) {
      if (useAsSource(link)) {
        sources.push(link)
      }
    } else {
      if (useAsDest(link)) {
        destinations.push(link)
      }
    }
  }

  if (sources.length === 0 || destinations.length === 0) {
    return
  }

  sources.sort(
    (l1, l2) => {
      // STRATEGY most energy first
      return l2.__cook__freeEnergy - l1.__cook__freeEnergy
    }
  )

  if (destinations.length > 1) {
    const workers = room.getRoomControlledWorkers()
    if (workers.length > 0) {
      for (const destination of destinations) {
        for (const worker of workers) {
          let pos

          if (worker.memory.dest) {
            const target = bootstrap.getObjectById(worker.memory.dest)
            if (target && target.pos) {
              pos = target.pos
            }
          }

          if (pos === undefined) {
            pos = worker.pos
          }

          const distance = destination.pos.manhattanDistance(pos)
          const proximity = 50 - distance
          const proximityNow = destination.__process_link_proximity || 0
          destination.__process_link_proximity = proximityNow + proximity
        }
      }
    }
  }

  destinations.sort(
    (l1, l2) => {
      const proxL1 = l1.__process_link_proximity || 0
      const proxL2 = l2.__process_link_proximity || 0

      if (proxL1 === proxL2) {
        // STRATEGY tie break - least energy
        return l1.store[RESOURCE_ENERGY] - l2.store[RESOURCE_ENERGY]
      }

      // STRATEGY link closest to worker clusters
      return proxL2 - proxL1
    }
  )

  let destinationIndex = 0
  for (const source of sources) {
    const destination = destinations[destinationIndex]

    source.transferEnergy(destination)

    ++destinationIndex
    if (destinationIndex >= destinations.length) {
      destinationIndex = 0
    }
  }
}

cook._operateLabs = function (room) {
  if (!room._my_) return
  if (room.labs.size === 0) return

  const properLabs = _.filter(
    Array.from(room.labs.values()),
    lab => {
      if (lab.__cook__cache__resourceType === '') return false

      if (lab.mineralType !== undefined) {
        return lab.mineralType === lab.__cook__cache__resourceType
      }

      return true
    }
  )

  const labsToOperate = _.sample(properLabs, room.memory.cook || 1)

  for (const lab of labsToOperate) {
    if (lab.cooldown && lab.cooldown > 0) continue
    if (lab.__cook__cache__isSource === true) continue

    if (lab.mineralType) {
      if (lab.store.getFreeCapacity(lab.mineralType) <= 0) continue
    }

    const input = lab.input()
    if (input === undefined) continue
    const inputMarks = _.words(input)

    let inputLab1
    let inputLab2
    for (const someLab of properLabs) {
      // because faster than string comparison
      if (someLab.__cook__cache__isSource === false) continue
      if (someLab.mineralType === undefined) continue

      if (someLab.id === lab.id) continue

      // mineral capacity is defined only when there is a mineral
      // if (someLab.store.getUsedCapacity(someLab.mineralType) <= 0) continue

      let mark = someLab.__cook__cache__mark
      if (mark === undefined) {
        mark = someLab.mark()
        someLab.__cook__cache__mark = mark
      }

      if (_.some(inputMarks, _.matches(mark))) {
        if (inputLab1 === undefined) {
          inputLab1 = someLab
          continue
        }

        if (inputLab1.mineralType !== someLab.mineralType) {
          inputLab2 = someLab
          break
        }
      }
    }

    if (inputLab1 && inputLab2) {
      // sanity check
      const reactionProduct = REACTIONS[inputLab1.mineralType][inputLab2.mineralType]
      if (lab.__cook__cache__resourceType !== reactionProduct) {
        console.log('Unexpected lab combination for lab ' + lab + ' trying to combine ' + inputLab1 + ' and ' + inputLab2 + ' expected [' + lab.__cook__cache__resourceType + ' but got [' + reactionProduct + ']')
        continue
      }

      lab.runReaction(inputLab1, inputLab2)
    }
  }
}

// called from room actor after controllers
cook.roomPost = function (room) {
  this._updateRoomRecepie(room)
  this._setWorldDemand(room)

  this._unloadActiveHarvesters(room)
  this._operateLinks(room)
  this._operateLabs(room)
}

cook._logActionCost = function (rc) {
  if (rc < OK) return

  const now = Game.__cook__cpuUsed || 0
  Game.__cook__cpuUsed = now + 0.2
}

cook._outOfCpu = function () {
  // this turns out to be an expensive call, cache it
  if (Game.__cook__cpuUsedBudget === undefined) {
    Game.__cook__cpuUsedBudget = PostCPUTarget - Game.cpu.getUsed()
  }

  if (Game.__cook__cpuUsedBudget <= 0) return true
  if (Game.__cook__cpuUsed === undefined) return false

  return Game.__cook__cpuUsed < Game.__cook__cpuUsedBudget
}

cook._performTerminalExchange = function () {
  const allTerminals = _.shuffle(Array.from(Game.terminals.values()))

  let targetTerminal
  let demandTypes
  for (const terminal of allTerminals) {
    const demandTypes1 = this.__worldDemandTypes(terminal)
    if (demandTypes1.length > 0) {
      targetTerminal = terminal
      demandTypes = _.shuffle(demandTypes1)
      break
    }
  }

  if (targetTerminal === undefined) {
    return ERR_FULL
  }

  // target terminal will always get first but eh, ok
  allTerminals.sort(
    (terminal1, terminal2) => {
      const d1 = terminal1.pos.getRoomLinearDistance(targetTerminal.pos, true)
      const d2 = terminal2.pos.getRoomLinearDistance(targetTerminal.pos, true)

      return d1 - d2
    }
  )

  let sourceTerminal
  let sourceType
  let sourceSupply

  for (const terminal of allTerminals) {
    if (terminal.id === targetTerminal.id) continue
    if (terminal._operated_) continue
    if (terminal.cooldown && terminal.cooldown > 0) continue
    if (terminal.store[RESOURCE_ENERGY] <= 0) continue

    for (const resourceType of demandTypes) {
      const supplyAmount = this.___worldSupply(terminal, resourceType)
      if (supplyAmount > 0) {
        sourceTerminal = terminal
        sourceType = resourceType
        sourceSupply = supplyAmount
        break // from demandTypes loop
      }
    }

    if (sourceTerminal) break // from allTerminals loop
  }

  if (sourceTerminal === undefined) {
    return ERR_NOT_ENOUGH_RESOURCES
  }

  const targetDemand = this.___worldDemand(targetTerminal, sourceType)
  if (targetDemand <= 0) {
    console.log('Unexpected world demant for terminal at [' + targetTerminal.pos + '] for resource type [' + sourceType + ']')
    return ERR_INVALID_TARGET
  }

  const exchange = Math.min(sourceSupply, targetDemand)

  const [rc, amount] = sourceTerminal.autoSend(sourceType, exchange, targetTerminal.room.name, 'internal exchange')
  if (rc >= OK) {
    console.log('Terminal in [' + sourceTerminal.room.name + '] helped terminal in [' + targetTerminal.room.name + '] with [' + amount + '] of [' + sourceType + ']')
    sourceTerminal._operated_ = true
  }
  return rc
}

cook.__operatePowerSpawn = function (powerSpawn) {
  if (powerSpawn.store.getUsedCapacity(RESOURCE_POWER) >= 1 &&
      powerSpawn.store.getUsedCapacity(RESOURCE_ENERGY) >= 50) {
    return powerSpawn.processPower()
  }

  return ERR_NOT_ENOUGH_RESOURCES
}

cook._operatePowerSpawns = function () {
  for (const powerSpawn of Game.powerSpawns.values()) {
    if (this._outOfCpu()) break
    this._logActionCost(this.__operatePowerSpawn(powerSpawn))
  }
}

cook.__operateFactory = function (factory) {
  if (factory.cooldown && factory.cooldown > 0) {
    return ERR_TIRED
  }

  if (factory.store.getUsedCapacity() <= 0) {
    return ERR_NOT_ENOUGH_RESOURCES
  }

  if (factory.store.getFreeCapacity() <= 0) {
    return ERR_FULL
  }

  if (factory.store.getUsedCapacity(RESOURCE_BATTERY) >= 50) {
    return factory.produce(RESOURCE_ENERGY)
  }

  if (factory.store.getUsedCapacity(RESOURCE_GHODIUM_MELT) >= 100 &&
      factory.store.getUsedCapacity(RESOURCE_ENERGY) >= 200) {
    return factory.produce(RESOURCE_GHODIUM)
  }

  return ERR_NOT_ENOUGH_RESOURCES
}

cook._operateFactories = function () {
  for (const factory of Game.factories.values()) {
    if (this._outOfCpu()) break
    this._logActionCost(this.__operateFactory(factory))
  }
}

cook.___findBuyOrder = function (terminal, resourceType) {
  const allBuyOrders = Game.market.getAllOrders({ type: ORDER_BUY, resourceType })
  if (allBuyOrders.length === 0) return undefined
  if (allBuyOrders.length === 1) return allBuyOrders[0]

  const randomBuyOrders = _.sample(allBuyOrders, 10)

  const roomNameFrom = terminal.room.name
  const ordered = _.sortByOrder(
    randomBuyOrders,
    [
      order => Game.map.getRoomLinearDistance(roomNameFrom, order.roomName, true),
      'price'
    ],
    [
      'asc',
      'desc'
    ]
  )

  return ordered[0]
}

cook.___excessToSell = function (terminal, resourceType) {
  // CHEMISTRY produce not to sell explicitly
  if (resourceType === RESOURCE_BATTERY) return 0
  if (resourceType === RESOURCE_CATALYZED_LEMERGIUM_ACID) return 0
  if (resourceType === RESOURCE_ENERGY) return 0
  if (resourceType === RESOURCE_GHODIUM_MELT) return 0
  if (resourceType === RESOURCE_GHODIUM) return 0
  if (resourceType === RESOURCE_HYDROXIDE) return 0
  if (resourceType === RESOURCE_LEMERGIUM_ACID) return 0
  if (resourceType === RESOURCE_LEMERGIUM_HYDRIDE) return 0
  if (resourceType === RESOURCE_OPS) return 0
  if (resourceType === RESOURCE_POWER) return 0
  if (resourceType === RESOURCE_UTRIUM_LEMERGITE) return 0
  if (resourceType === RESOURCE_ZYNTHIUM_KEANITE) return 0

  const used = intentSolver.getUsedCapacityMin(terminal, resourceType) || 0
  const plannedDelta = this.___plannedDelta(terminal, resourceType)
  let free = plannedDelta > 0 ? used : (used + plannedDelta)

  if (free <= 0) return 0

  if (this.___roomNeedResource(terminal.room, resourceType) > 0) return 0

  if (terminal.room.mineralType() === resourceType) {
    free -= TerminalRoomMineralStore
  }

  // CHEMISTRY base reagents decrease
  if (resourceType === RESOURCE_KEANIUM) {
    free -= TerminalBaseReagentStore
  }

  if (resourceType === RESOURCE_LEMERGIUM) {
    free -= TerminalBaseReagentStore
  }

  if (resourceType === RESOURCE_UTRIUM) {
    free -= TerminalBaseReagentStore
  }

  if (resourceType === RESOURCE_ZYNTHIUM) {
    free -= TerminalBaseReagentStore
  }

  if (resourceType === RESOURCE_CATALYST) {
    free -= TerminalBaseReagentStore
  }

  if (resourceType === RESOURCE_HYDROGEN) {
    free -= TerminalBaseReagentStore
  }

  if (resourceType === RESOURCE_OXYGEN) {
    free -= TerminalBaseReagentStore
  }

  return Math.max(free, 0)
}

cook.__sellTerminalExcess = function (terminal) {
  if (terminal._operated_) {
    return ERR_TIRED
  }

  if (terminal.cooldown && terminal.cooldown > 0) {
    return ERR_TIRED
  }

  const resources = intentSolver.getUsedCapacityMinKeys(terminal)
  if (!_.some(resources, _.matches(RESOURCE_ENERGY))) return ERR_NOT_ENOUGH_RESOURCES

  const resourceType = _.sample(resources)
  const excess = this.___excessToSell(terminal, resourceType)
  if (excess > 0) {
    const order = this.___findBuyOrder(terminal, resourceType)
    if (order) {
      const [rc, armount] = terminal.autoSell(order, excess)
      if (rc >= OK) {
        console.log('Terminal in [' + terminal.room.name + '] sold [' + armount + '] of [' + resourceType + ']')
        terminal._operated_ = true
        return rc
      }
    }
  }

  return ERR_NOT_ENOUGH_RESOURCES
}

cook._sellTerminalsExcess = function () {
  for (const terminal of Game.terminals.values()) {
    if (this._outOfCpu()) break
    this._logActionCost(this.__sellTerminalExcess(terminal))
  }
}

// called from main after other actors
cook.globalPost = function () {
  if (this._outOfCpu()) return

  this._performTerminalExchange()

  if (Game._war_) return

  this._operatePowerSpawns()
  this._operateFactories()

  if (Game._fight_) return

  this._sellTerminalsExcess()
}

cook.register()

module.exports = cook
