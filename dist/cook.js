'use strict'

const bootstrap = require('./bootstrap')

const intentSolver = require('./routine.intent')

const Controller = require('./controller.template')

const cook = new Controller('cook')

// STRATEGY demands and supplies
const WorldSupplyHisteresis = 2500

const TerminalEnergyDemand = 30000
const TerminalRoomMineralStore = 200000
const TerminalNukeReagentStore = 5000
const TerminalOtherStuffStore = 25000

const FactoryAnyReagentDemand = 10000
const FactoryGhodiumMeltMaxStore = 15000
const FactoryBatteryMaxStore = 45000
const FactoryTotalMaxStore = 45000

// made up value that is used to plug planned capacity on first assignment
const MadeUpLargeNumber = 1000000

// STRATEGY link send values
const LinkSourceTreshold = LINK_CAPACITY / 2
const LinkDestinationTreshold = LINK_CAPACITY / 16

// STRATEGY CPU reservation strategy
const PostCPUTarget = Game.cpu.limit - 0.5

cook.actRange = 1

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
    return intentSolver.getUsedCapacity(structure, resourceType) || 0
  }

  if (structureType === STRUCTURE_FACTORY) {
    if (resourceType === RESOURCE_GHODIUM_MELT ||
        resourceType === RESOURCE_BATTERY) {
      return 0
    }

    if (resourceType === RESOURCE_ENERGY) {
      const nowReagent2 = intentSolver.getUsedCapacity(structure, resourceType) || 0
      const nowReagent1 = intentSolver.getUsedCapacity(structure, RESOURCE_GHODIUM_MELT) || 0
      if (nowReagent1 <= 0) return nowReagent2

      const toKeep = nowReagent1 * 2
      const free = nowReagent2 - toKeep
      return Math.max(free, 0)
    }

    return intentSolver.getUsedCapacity(structure, resourceType) || 0
  }

  if (structureType === STRUCTURE_LAB) {
    // TODO ___roomSupply cook schema
    return 0
  }

  if (structureType === STRUCTURE_TERMINAL) {
    if (resourceType === RESOURCE_ENERGY) {
      const now = intentSolver.getUsedCapacity(structure, resourceType) || 0
      const free = now - TerminalEnergyDemand
      return Math.max(free, 0)
    }

    return intentSolver.getUsedCapacity(structure, resourceType) || 0
  }

  return 0
}

cook.__hasSupply = function (structure, resourceType) {
  // save typing down the line
  if (structure === undefined) return false

  const supply = this.___roomSupply(structure, resourceType)
  const planned = this.___plannedDelta(structure, resourceType)

  return supply + planned > 0
}

cook.___hasFlush = function (structure) {
  if (structure === undefined) return undefined

  const structureType = structure.structureType

  if (structureType === STRUCTURE_CONTAINER) {
    const stored = _.shuffle(_.keys(structure.store))
    for (const resourceType of stored) {
      if (resourceType === RESOURCE_ENERGY) continue

      if (this.__hasSupply(structure, resourceType)) return resourceType
    }

    return undefined
  }

  if (structureType === STRUCTURE_FACTORY) {
    const stored = _.shuffle(_.keys(structure.store))
    for (const resourceType of stored) {
      if (resourceType === RESOURCE_GHODIUM_MELT) continue
      if (resourceType === RESOURCE_BATTERY) continue
      if (resourceType === RESOURCE_GHODIUM) continue
      if (resourceType === RESOURCE_ENERGY) continue

      if (this.__hasSupply(structure, resourceType)) return resourceType
    }

    return undefined
  }

  if (structureType === STRUCTURE_STORAGE) {
    const stored = _.shuffle(_.keys(structure.store))
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
  const roomSupply = this.___roomSupply(structure, resourceType)
  // STRATEGY histeresis on resource movement
  if (roomSupply <= WorldSupplyHisteresis) return 0

  return roomSupply
}

cook.___roomDemand = function (structure, resourceType) {
  const structureType = structure.structureType

  if (structureType === STRUCTURE_EXTENSION ||
      structureType === STRUCTURE_SPAWN ||
      structureType === STRUCTURE_TOWER) {
    if (resourceType !== RESOURCE_ENERGY) return 0

    return intentSolver.getFreeCapacity(structure, resourceType) || 0
  }

  if (structureType === STRUCTURE_LAB) {
    // TODO ___roomDemand cook schema
    return 0
  }

  if (structureType === STRUCTURE_TERMINAL) {
    if (resourceType !== RESOURCE_ENERGY) return 0

    const now = intentSolver.getUsedCapacity(structure, resourceType) || 0
    const left = TerminalEnergyDemand - now
    return Math.max(left, 0)
  }

  if (structureType === STRUCTURE_FACTORY) {
    if (resourceType === RESOURCE_GHODIUM_MELT ||
        resourceType === RESOURCE_BATTERY) {
      const now = intentSolver.getUsedCapacity(structure, resourceType) || 0
      const left = FactoryAnyReagentDemand - now
      return Math.max(left, 0)
    }

    if (resourceType === RESOURCE_ENERGY) {
      const nowReagent1 = intentSolver.getUsedCapacity(structure, RESOURCE_GHODIUM_MELT) || 0
      if (nowReagent1 <= 0) return 0

      const nowReagent2 = intentSolver.getUsedCapacity(structure, resourceType) || 0
      const left = (nowReagent1 * 2) - nowReagent2
      return Math.max(left, 0)
    }

    return 0
  }

  if (structureType === STRUCTURE_NUKER) {
    if (resourceType === RESOURCE_ENERGY ||
        resourceType === RESOURCE_GHODIUM) {
      return intentSolver.getFreeCapacity(structure, resourceType) || 0
    }

    return 0
  }

  if (structureType === STRUCTURE_POWER_SPAWN) {
    if (resourceType === RESOURCE_ENERGY) {
      const demand = intentSolver.getFreeCapacity(structure, resourceType) || 0
      // STRATEGY avoid repeated trips
      if (demand <= 5000) return 0
      return demand
    }

    if (resourceType === RESOURCE_POWER) {
      const demand = intentSolver.getFreeCapacity(structure, resourceType) || 0
      // STRATEGY avoid repeated trips
      if (demand <= 100) return 0
      return demand
    }

    return 0
  }

  return 0
}

cook._hasDemand = function (structure, resourceType) {
  // save typing down the line
  if (structure === undefined) return false

  const demand = this.___roomDemand(structure, resourceType)
  const planned = this.___plannedDelta(structure, resourceType)

  return demand > planned
}

cook.___roomSpace = function (structure, resourceType) {
  let above = 0
  const structureType = structure.structureType

  if (structureType === STRUCTURE_CONTAINER) {
    if (resourceType === RESOURCE_ENERGY) {
      above = intentSolver.getFreeCapacity(structure, resourceType) || 0
    }
  }

  if (structureType === STRUCTURE_FACTORY) {
    const totalUsed = intentSolver.getUsedCapacity(structure) || 0
    if (totalUsed >= FactoryTotalMaxStore) return 0
    const totalRemaining = FactoryTotalMaxStore - totalUsed

    if (resourceType === RESOURCE_GHODIUM_MELT) {
      const used = intentSolver.getUsedCapacity(structure, resourceType) || 0
      const remaining = FactoryGhodiumMeltMaxStore - used
      above = Math.max(remaining, 0)
    }

    if (resourceType === RESOURCE_BATTERY) {
      const used = intentSolver.getUsedCapacity(structure, resourceType) || 0
      const remaining = FactoryBatteryMaxStore - used
      above = Math.max(remaining, 0)
    }

    if (above > 0) {
      const free = intentSolver.getFreeCapacity(structure, resourceType) || 0
      above = Math.min(totalRemaining, free, above)
    }
  }

  if (structureType === STRUCTURE_STORAGE) {
    if (resourceType === RESOURCE_OPS ||
        resourceType === RESOURCE_POWER) {
      above = intentSolver.getFreeCapacity(structure, resourceType) || 0
    }
  }

  if (structureType === STRUCTURE_TERMINAL) {
    // it is handled in demand
    if (resourceType !== RESOURCE_ENERGY) {
      let allowed = 0

      if (resourceType === structure.room.mineralType()) {
        allowed += TerminalRoomMineralStore
      }

      if (resourceType === RESOURCE_KEANIUM) {
        allowed += TerminalNukeReagentStore
      }

      if (resourceType === RESOURCE_LEMERGIUM) {
        allowed += TerminalNukeReagentStore
      }

      if (resourceType === RESOURCE_UTRIUM) {
        allowed += TerminalNukeReagentStore
      }

      if (resourceType === RESOURCE_ZYNTHIUM) {
        allowed += TerminalNukeReagentStore
      }

      // one of resources kept by name
      if (allowed > 0) {
        const used = intentSolver.getUsedCapacity(structure, resourceType) || 0
        // STRATEGY allow overflow of named resources to be sold
        const remaining = TerminalOtherStuffStore + allowed - used
        above = Math.max(remaining, 0)
      } else {
        const useful = new Map()
        useful.set(structure.room.mineralType(), intentSolver.getUsedCapacity(structure, structure.room.mineralType()) || 0)
        useful.set(RESOURCE_KEANIUM, intentSolver.getUsedCapacity(structure, RESOURCE_KEANIUM) || 0)
        useful.set(RESOURCE_LEMERGIUM, intentSolver.getUsedCapacity(structure, RESOURCE_LEMERGIUM) || 0)
        useful.set(RESOURCE_UTRIUM, intentSolver.getUsedCapacity(structure, RESOURCE_UTRIUM) || 0)
        useful.set(RESOURCE_ZYNTHIUM, intentSolver.getUsedCapacity(structure, RESOURCE_ZYNTHIUM) || 0)
        useful.set(RESOURCE_ENERGY, intentSolver.getUsedCapacity(structure, RESOURCE_ENERGY) || 0)

        let usedByUseful = 0
        useful.forEach(value => (usedByUseful += value))
        const usedTotal = intentSolver.getUsedCapacity(structure) || 0
        const usedByUseless = Math.max(usedTotal - usedByUseful, 0)
        const remaining = TerminalOtherStuffStore - usedByUseless
        above = Math.max(remaining, 0)
      }

      if (above > 0) {
        const free = intentSolver.getFreeCapacity(structure, resourceType) || 0
        above = Math.min(free, above)
      }
    }
  }

  // default to demand only
  return Math.max(above, this.___roomDemand(structure, resourceType))
}

cook._hasSpace = function (structure, resourceType) {
  // save typing down the line
  if (structure === undefined) return false

  const lambda = () => {
    const space = this.___roomSpace(structure, resourceType)
    const planned = this.___plannedDelta(structure, resourceType)

    return space > planned
  }

  return intentSolver.getWithIntentCache(structure, '__cook__hasSpace', lambda)
}

cook._labClusterDemandTarget = function (room, resourceType) {
  for (const lab of room.labs.values()) {
    if (this._hasDemand(lab, resourceType)) return [lab, resourceType]
  }

  return [undefined, undefined]
}

cook.___addWorldDemand = function (structure, resourceType, amount) {
  if (structure.__cook__worldDemandMap === undefined) {
    structure.__cook__worldDemandMap = new Map()
  }

  const now = structure.__cook__worldDemandMap.get(resourceType) || 0
  structure.__cook__worldDemandMap.set(resourceType, now + amount)
}

cook.___worldDemand = function (structure, resourceType) {
  if (structure.__cook__worldDemandMap) {
    return structure.__cook__worldDemandMap.get(resourceType) || 0
  }

  return 0
}

cook.__worldDemandTypes = function (structure) {
  if (structure.__cook__worldDemandMap) {
    return Array.from(structure.__cook__worldDemandMap.keys())
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
    bootstrap.unassignCreep(creep)
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
  for (const resourceType in creep.store) {
    const usedSpace = intentSolver.getUsedCapacity(creep, resourceType) || 0
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

  const canTake = intentSolver.getFreeCapacity(creep, resourceType) || 0
  if (canTake <= 0) return ERR_FULL

  const wantGive = this.___roomSupply(structure, resourceType)
  if (wantGive <= 0) return ERR_NOT_ENOUGH_RESOURCES

  const amount = Math.min(canTake, wantGive, resoureAmount)

  return this.wrapIntent(creep, 'withdraw', structure, resourceType, amount)
}

cook._controllerWithdrawFromStructureToCreep = function (structure, creep, resourceType) {
  const rc = this.__withdrawFromStructureToCreep(structure, creep, resourceType)
  // to avoid observe calls
  if (rc >= OK) return bootstrap.ERR_TERMINATED

  return rc
}

cook.__transferFromCreepToStructure = function (structure, creep, resourceType) {
  // check first because dump mode
  const canTake = this.___roomSpace(structure, resourceType)
  if (canTake <= 0) return ERR_FULL

  const canGiveInt = intentSolver.getUsedCapacity(creep, resourceType) || 0
  const canGiveNow = creep.store.getUsedCapacity(resourceType) || 0
  const canGive = Math.min(canGiveInt, canGiveNow)
  if (canGive <= 0) return ERR_NOT_ENOUGH_RESOURCES

  const amount = Math.min(canGive, canTake)

  return this.wrapIntent(creep, 'transfer', structure, resourceType, amount)
}

cook._controllerTransferFromCreepToStructure = function (structure, creep) {
  for (const resourceType in creep.store) {
    const rc = this.__transferFromCreepToStructure(structure, creep, resourceType)
    // to avoid observe calls
    if (rc >= OK) return bootstrap.ERR_TERMINATED
  }

  return ERR_NOT_ENOUGH_RESOURCES
}

// << controller
cook.roomPrepare = function (room) {
  room.__cook__pass = 0

  room.__cook__containers = _.filter(
    room.find(FIND_STRUCTURES),
    structure => structure.structureType === STRUCTURE_CONTAINER && structure.isActiveSimple
  )
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

cook.__hasEnergyDemand = function (structure) {
  if (structure.__cook__hasEnergyDemand !== undefined) {
    return structure.__cook__hasEnergyDemand
  }

  structure.__cook__hasEnergyDemand = this._hasDemand(structure, RESOURCE_ENERGY)
  return structure.__cook__hasEnergyDemand
}

cook.onAssign = function (target, creep) {
  if (target.room.__cook__energyRestockAssign) {
    target.__cook__hasEnergyDemand = false
  }

  if (creep.memory.xtra) {
    this._reserveFromStructureToCreep(target, creep, creep.memory.xtra)
    target.__cook__recheckSupply = true
  }
}

cook.validateTarget = function (allTargets, target, creep) {
  // pay respect to defaults
  if (!this._validateTarget(allTargets, target, creep)) {
    return false
  }

  if (target.__cook__resourceToTake && target.__cook__recheckSupply) {
    return this.__hasSupply(target, target.__cook__resourceToTake)
  }

  return true
}

cook._energyRestockPass1 = function (room, creeps) {
  if (creeps.length === 0) {
    return [[], []]
  }

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

  let unused
  let used

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
  const resourceTypes = _.shuffle(_.keys(creep.store))
  for (const resourceType1 of resourceTypes) {
    if (resourceType1 === RESOURCE_ENERGY) continue
    resourceType = resourceType1
    break
  }

  if (resourceType === undefined) {
    console.log('Unexpected creep [' + creep.name + '] for resource restock')
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
  const empty = []
  const creepsWithOnlyEnergy = []
  const creepsWithNonEnergy = []

  for (const creep of creeps) {
    const total = intentSolver.getUsedCapacity(creep) || 0

    if (total <= 0) {
      empty.push(creep)
      continue
    }

    const energy = intentSolver.getUsedCapacity(creep, RESOURCE_ENERGY) || 0

    if (total > energy) {
      creepsWithNonEnergy.push(creep)
    } else {
      creepsWithOnlyEnergy.push(creep)
    }
  }

  // unload

  this._creepPerTarget = true

  room.__cook__energyRestockAssign = true
  const [energyUnused, energyUsed] = this._energyRestockPass1(room, creepsWithOnlyEnergy)
  room.__cook__energyRestockAssign = undefined

  const [resourceUnused, resourceUsed] = this._resourceRestock(room, creepsWithNonEnergy)

  const unused = empty.concat(energyUnused).concat(resourceUnused)
  const used = energyUsed.concat(resourceUsed)

  // assign traps
  // STRATEGY trap only workers for energy
  let hasUnusedWorkerWithEnergy = false
  for (const creep of energyUnused) {
    if (creep.memory.btyp === 'worker') {
      hasUnusedWorkerWithEnergy = true
      break
    }
  }

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
  for (const spawn of room.spawns.values()) {
    if (this.__hasEnergyDemand(spawn)) return true
  }

  // this is so numerous that any speedup helps
  for (const extension of room.extensions.values()) {
    if (extension.__cook__hasEnergyDemand === true) return true
    if (extension.__cook__hasEnergyDemand === false) continue
    if (this.__hasEnergyDemand(extension)) return true
  }

  for (const tower of room.towers.values()) {
    if (this.__hasEnergyDemand(tower)) return true
  }

  return false
}

cook.__energyRestockSources = function (room) {
  if (room.__cook__energyRestockSources) {
    return room.__cook__energyRestockSources
  }

  const sources = []

  for (const container of room.__cook__containers) {
    if (this.__hasSupply(container, RESOURCE_ENERGY)) sources.push(container)
  }

  if (this.__hasSupply(room.factory, RESOURCE_ENERGY)) sources.push(room.factory)

  for (const link of room.links.values()) {
    if (this.__hasSupply(link, RESOURCE_ENERGY)) sources.push(link)
  }

  if (this.__hasSupply(room.storage, RESOURCE_ENERGY)) sources.push(room.storage)
  if (this.__hasSupply(room.terminal, RESOURCE_ENERGY)) sources.push(room.terminal)

  for (const source of sources) {
    source.__cook__resourceToTake = RESOURCE_ENERGY
    source.__cook__restockToTakeAmount = MadeUpLargeNumber
  }

  room.__cook__energyRestockSources = sources
  return sources
}

cook.___roomNeedResource = function (room, resourceType) {
  if (room.__cook__roomNeedResourceMap === undefined) {
    room.__cook__roomNeedResourceMap = new Map()
  }

  const cached = room.__cook__roomNeedResourceMap.get(resourceType)
  if (cached !== undefined) return cached

  const withCache = (x, key, value) => {
    x.__cook__roomNeedResourceMap.set(key, value)
    return value
  }

  if (room.factory) {
    const demand = this.___roomDemand(room.factory, resourceType)
    if (demand > 0) return withCache(room, resourceType, demand)
  }

  for (const lab of room.labs.values()) {
    const demand = this.___roomDemand(lab, resourceType)
    if (demand > 0) return withCache(room, resourceType, demand)
  }

  if (room.nuker) {
    const demand = this.___roomDemand(room.nuker, resourceType)
    if (demand > 0) return withCache(room, resourceType, demand)
  }

  if (room.powerSpawn) {
    const demand = this.___roomDemand(room.powerSpawn, resourceType)
    if (demand > 0) return withCache(room, resourceType, demand)
  }

  if (room.storage) {
    const demand = this.___roomDemand(room.storage, resourceType)
    if (demand > 0) return withCache(room, resourceType, demand)
  }

  if (room.terminal) {
    const demand = this.___roomDemand(room.terminal, resourceType)
    if (demand > 0) return withCache(room, resourceType, demand)
  }

  return withCache(room, resourceType, 0)
}

cook.__resourceRestockSources = function (room, count) {
  if (count === 0) return []

  const sources = []

  const pushStore = structure => {
    if (structure === undefined) return false

    const stored = _.shuffle(_.keys(structure.store))
    for (const resourceType of stored) {
      if (resourceType === RESOURCE_ENERGY) continue

      if (!this.__hasSupply(structure, resourceType)) continue

      const roomDemand = this.___roomNeedResource(room, resourceType)
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
  if (sources.length >= count) return sources

  return sources
}

cook.__prio3EnergyRestockTargets = function (room, count) {
  if (count === 0) return []

  const targets = []

  if (room.terminal && this.__hasEnergyDemand(room.terminal)) targets.push(room.terminal)
  if (targets.length >= count) return targets

  for (const lab of room.labs.values()) {
    if (this.__hasEnergyDemand(lab)) {
      targets.push(lab)
      if (targets.length >= count) return targets
    }
  }

  if (room.nuker && this.__hasEnergyDemand(room.nuker)) targets.push(room.nuker)
  if (targets.length >= count) return targets

  if (room.powerSpawn && this.__hasEnergyDemand(room.powerSpawn)) targets.push(room.powerSpawn)
  if (targets.length >= count) return targets

  if (room.factory && this.__hasEnergyDemand(room.factory)) targets.push(room.factory)
  if (targets.length >= count) return targets

  if (room.storage && this.__hasEnergyDemand(room.storage)) targets.push(room.storage)

  return targets
}

cook.extra = function (target) {
  if (target.__cook__resourceToTake !== undefined &&
      target.__cook__restockToTakeAmount !== undefined) {
    return target.__cook__resourceToTake + ':' + target.__cook__restockToTakeAmount
  }

  return undefined
}

cook._controlPass2 = function (room, creeps) {
  if (room._actType_ === bootstrap.RoomActTypeMy) {
    // transfer energy reserves from containers to links
    for (const link of room.links.values()) {
      if (!link.isSource()) continue

      const canTake = intentSolver.getFreeCapacity(link, RESOURCE_ENERGY) || 0
      if (canTake <= 0) continue

      for (const creep of creeps) {
        if (creep.memory.btyp !== 'harvester') continue
        if (!creep.pos.isNearTo(link)) continue

        const canGiveInt = intentSolver.getUsedCapacity(creep, RESOURCE_ENERGY) || 0
        const canGiveNow = creep.store.getUsedCapacity(RESOURCE_ENERGY) || 0
        const canGive = Math.min(canGiveInt, canGiveNow)
        if (canGive > 0) {
          const amount = Math.min(canTake, canGive)
          const rc = this.wrapIntent(creep, 'transfer', link, RESOURCE_ENERGY, amount)
          if (rc >= OK) {
            creep.__cook__pass2__used = true
            break // from creeps loop
          }
        } else {
          for (const container of room.__cook__containers) {
            if (!creep.pos.isNearTo(container)) continue
            if (!this.__hasSupply(container, RESOURCE_ENERGY)) continue

            const rc1 = this.wrapIntent(creep, 'withdraw', container, RESOURCE_ENERGY)
            if (rc1 >= OK) {
              creep.__cook__pass2__used = true
              break // from containers loop
            }
          }

          if (creep.__cook__pass2__used) break // from creeps loop
        }
      }
    }
  }

  if (room._actType_ === bootstrap.RoomActTypeRemoteHarvest) {
    for (const creep of creeps) {
      if (creep.__cook__pass2__used) continue
      if (creep.memory.btyp !== 'harvester') continue

      const canGiveInt = intentSolver.getUsedCapacity(creep, RESOURCE_ENERGY) || 0
      const canGiveNow = creep.store.getUsedCapacity(RESOURCE_ENERGY) || 0
      const canGive = Math.min(canGiveInt, canGiveNow)
      if (canGive > 0) {
        for (const container of room.__cook__containers) {
          if (!container.isSource()) continue
          if (!creep.pos.isNearTo(container)) continue

          const canTake = intentSolver.getFreeCapacity(container, RESOURCE_ENERGY) || 0
          if (canTake > 0) {
            const amount = Math.min(canGive, canTake)
            const rc = this.wrapIntent(creep, 'transfer', container, RESOURCE_ENERGY, amount)
            if (rc >= OK) {
              creep.__cook__pass2__used = true
              break // from containers loop
            }
          }
        }
      }
    }
  }

  let priorityEnergyCycle = false

  const hasEnergyTrap = _.some(room.traps, _.matches(RESOURCE_ENERGY))
  const hasPrioEnergyDemand = this.__hasPrio1And2EnergyRestockTargets(room)

  if (hasEnergyTrap || hasPrioEnergyDemand) {
    priorityEnergyCycle = true

    const wantEnergy = []
    for (const creep of creeps) {
      if (creep.__cook__pass2__used) continue

      if (hasEnergyTrap && creep._was_trap_ === RESOURCE_ENERGY) {
        wantEnergy.push(creep)
        continue
      }

      if (hasPrioEnergyDemand && this._hasCM(creep) && this._isEmpty(creep)) {
        wantEnergy.push(creep)
      }
    }

    if (wantEnergy.length > 0) {
      const energyRestockSources = this.__energyRestockSources(room)
      if (energyRestockSources.length > 0) {
        this._creepPerTarget = false
        // eslint-disable-next-line no-unused-vars
        const [unused, used] = this.assignCreeps(room, wantEnergy, energyRestockSources)
        for (const creep of used) {
          creep.__cook__pass2__used = true
        }
      }
    }
  }

  if (!priorityEnergyCycle) {
    let transports = []
    for (const creep of creeps) {
      if (creep.__cook__pass2__used) continue

      if (this._hasCM(creep) && this._isEmpty(creep)) {
        transports.push(creep)
      }
    }

    if (transports.length > 0) {
      const resourceRestockSources = this.__resourceRestockSources(room, transports.length)
      if (resourceRestockSources.length > 0) {
        this._creepPerTarget = false
        const [unused, used] = this.assignCreeps(room, transports, resourceRestockSources)
        for (const creep of used) {
          creep.__cook__pass2__used = true
        }
        transports = unused
      }
    }

    // go fill with energy, always an opportunity
    if (transports.length > 0) {
      const energyRestockSources = this.__energyRestockSources(room)
      if (energyRestockSources.length > 0) {
        const prio3EnergyRestockTargets = this.__prio3EnergyRestockTargets(room, transports.length)
        if (prio3EnergyRestockTargets.length > 0) {
          transports = _.sample(transports, prio3EnergyRestockTargets.length)

          this._creepPerTarget = false
          const [unused, used] = this.assignCreeps(room, transports, energyRestockSources)
          for (const creep of used) {
            creep.__cook__pass2__used = true
          }
          transports = unused
        }
      }
    }

    // send upgraders to upgrade
    if (transports.length > 0) {
      const upgraders = []
      for (const creep of transports) {
        if (creep.__cook__pass2__used) continue
        if (creep.memory.btyp !== 'upgrader') continue

        upgraders.push(creep)
      }

      if (upgraders.length > 0) {
        const energyRestockSources = this.__energyRestockSources(room)
        if (energyRestockSources.length > 0) {
          this._creepPerTarget = false
          // eslint-disable-next-line no-unused-vars
          const [unused, used] = this.assignCreeps(room, upgraders, energyRestockSources)
          for (const creep of used) {
            creep.__cook__pass2__used = true
          }
        }
      }
    }
  }

  room.traps = []

  const remainder = []
  for (const creep of creeps) {
    creep._trap_ = undefined
    creep._was_trap_ = undefined

    if (creep.__cook__pass2__used) continue

    if (this._hasCM(creep) && this._hasEnergy(creep)) {
      remainder.push(creep)
    }
  }

  if (remainder.length > 0) {
    const prio3EnergyRestockTargets = this.__prio3EnergyRestockTargets(room, remainder.length)
    if (prio3EnergyRestockTargets.length > 0) {
      this._creepPerTarget = true
      // eslint-disable-next-line no-unused-vars
      const [unused, used] = this.assignCreeps(room, remainder, prio3EnergyRestockTargets)
      for (const creep of used) {
        creep.__cook__pass2__used = true
      }
    }
  }

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

  if (this._hasSpace(room.terminal, mineralType)) return true

  const [someLab, someResourceType] = this._labClusterDemandTarget(room, mineralType)
  return someLab !== undefined && someResourceType !== undefined
}

cook._askWorld = function (room) {
  if (!room._my_) return
  if (!room.terminal) return

  const roomSourceLevel = room.memory.slvl || 0
  if (roomSourceLevel < 2) {
    if (!this.__hasSupply(room.terminal, RESOURCE_ENERGY)) {
      this.___addWorldDemand(room.terminal, RESOURCE_ENERGY, SOURCE_ENERGY_CAPACITY)
    }
  }
}

cook._operateHarvesters = function (room) {
  const roomCreeps = room.getRoomControlledCreeps()

  const harvesters = _.filter(
    roomCreeps,
    creep => {
      if (creep._source_harvest_specialist_rc_ === OK) return false
      if (creep._source_ === undefined) return false
      if (creep.memory.atds !== true) return false
      if (creep.memory.btyp !== 'harvester') return false
      if (creep.store.getUsedCapacity(RESOURCE_ENERGY) <= 0) return false

      return true
    }
  )

  if (harvesters.length === 0) return

  const containers = room.__cook__containers
  const links = Array.from(room.links.values())

  if (containers.length === 0 && links.length === 0) return

  const notMaxHits = structure => structure.hits < structure.hitsMax

  const terrain = new Room.Terrain(room.name)
  const calculateHarvestSpot = (some1, some2) => {
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
    if (_.some(clusterContainers, notMaxHits)) continue

    let clusterLinks = _.filter(links, link => link.pos.manhattanDistance(harvester._source_.pos) === 2)
    if (_.some(clusterLinks, notMaxHits)) continue

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
      harvestSpot = calculateHarvestSpot(harvester._source_, link)
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

    let transferred = false
    for (const link of clusterLinks) {
      const rc = this.__transferFromCreepToStructure(link, harvester, RESOURCE_ENERGY)
      if (rc >= OK) {
        transferred = true
        break // from links loop
      }
    }

    if (!transferred) {
      if (room._actType_ !== bootstrap.RoomActTypeRemoteHarvest) {
        // unload to containers only when there is more energy in source
        // otherwise continue to next harvester
        const hrc = harvester._source_harvest_specialist_rc_
        if (hrc === bootstrap.WARN_BOTH_EXHAUSED) continue
        if (hrc === bootstrap.WARN_INTENDED_EXHAUSTED) continue
        if (hrc === bootstrap.ERR_INTENDED_EXHAUSTED) continue
        if (hrc === ERR_NOT_ENOUGH_RESOURCES) continue
      }

      for (const container of clusterContainers) {
        const rc = this.__transferFromCreepToStructure(container, harvester, RESOURCE_ENERGY)
        if (rc >= OK) {
          transferred = true
          break // from containers loop
        }
      }
    }
  }
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
    const energyInt = intentSolver.getUsedCapacity(someLink, RESOURCE_ENERGY) || 0
    const energyNow = someLink.store.getUsedCapacity(RESOURCE_ENERGY) || 0
    const energy = Math.min(energyInt, energyNow)

    const plannedDelta = this.___plannedDelta(someLink, RESOURCE_ENERGY)

    const freeEnergy = plannedDelta > 0 ? energy : (energy + plannedDelta)

    someLink.__cook__freeEnergy = freeEnergy

    // to avoid frantic sends
    return freeEnergy >= LinkSourceTreshold
  }

  const useAsDest = someLink => {
    const freeInt = intentSolver.getFreeCapacity(someLink, RESOURCE_ENERGY)
    const freeNow = someLink.store.getFreeCapacity(RESOURCE_ENERGY)
    const free = Math.min(freeInt, freeNow)

    // cut off transfer, due to losses it is never 100% full
    return free >= LinkDestinationTreshold
  }

  for (const link of allLinks) {
    // quick flag, source keeps to be source
    if (link.isSource()) {
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

    source.transferEnergy(destination, source.__cook__freeEnergy)

    ++destinationIndex
    if (destinationIndex >= destinations.length) {
      destinationIndex = 0
    }
  }
}

cook._operateLabs = function (room) {
  // TODO _operateLabs cook schema
}

// called from room actor after controllers
cook.roomPost = function (room) {
  this._askWorld(room)
  this._operateHarvesters(room)
  this._operateLinks(room)
  this._operateLabs(room)
}

cook._outOfCpu = function () {
  return Game.cpu.getUsed() >= PostCPUTarget
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
      const d1 = Game.map.getRoomLinearDistance(terminal1.room.name, targetTerminal.room.name, true)
      const d2 = Game.map.getRoomLinearDistance(terminal2.room.name, targetTerminal.room.name, true)

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

  const amount = Math.min(sourceSupply, targetDemand)

  const rc = sourceTerminal.autoSend(sourceType, amount, targetTerminal.room.name, 'internal exchange')
  if (rc >= OK) {
    console.log('Terminal ' + sourceTerminal + ' helped terminal ' + targetTerminal + ' with [' + amount + '] of [' + sourceType + ']')
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
    this.__operatePowerSpawn(powerSpawn)
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
    this.__operateFactory(factory)
  }
}

cook.___findBuyOrder = function (resourceType) {
  const allBuyOrders = Game.market.getAllOrders({ type: ORDER_BUY, resourceType })
  // STRATEGY just sell at random
  return _.sample(allBuyOrders)
}

cook.___excessToSell = function (terminal, resourceType) {
  if (resourceType === RESOURCE_BATTERY) return 0
  if (resourceType === RESOURCE_GHODIUM_MELT) return 0
  if (resourceType === RESOURCE_GHODIUM) return 0
  if (resourceType === RESOURCE_OPS) return 0
  if (resourceType === RESOURCE_POWER) return 0

  const usedInt = intentSolver.getUsedCapacity(terminal, resourceType) || 0
  const usedNow = terminal.store.getUsedCapacity(resourceType)

  const used = Math.min(usedInt, usedNow)

  const plannedDelta = this.___plannedDelta(terminal, resourceType)

  let free = plannedDelta > 0 ? used : (used + plannedDelta)

  if (free <= 0) return 0

  if (resourceType === RESOURCE_ENERGY) {
    free -= TerminalEnergyDemand
    return Math.max(free, 0)
  }

  if (this.___roomNeedResource(terminal.room, resourceType) > 0) return 0

  if (terminal.room.mineralType() === resourceType) {
    free -= TerminalRoomMineralStore
  }

  if (resourceType === RESOURCE_KEANIUM) {
    free -= TerminalNukeReagentStore
  }

  if (resourceType === RESOURCE_LEMERGIUM) {
    free -= TerminalNukeReagentStore
  }

  if (resourceType === RESOURCE_UTRIUM) {
    free -= TerminalNukeReagentStore
  }

  if (resourceType === RESOURCE_ZYNTHIUM) {
    free -= TerminalNukeReagentStore
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

  const resourceTypes = _.shuffle(_.keys(terminal.store))
  for (const resourceType of resourceTypes) {
    const excess = this.___excessToSell(terminal, resourceType)
    if (excess > 0) {
      const order = this.___findBuyOrder(resourceType)
      if (order) {
        const rc = terminal.autoSell(order, excess)
        if (rc >= OK) {
          terminal._operated_ = true
          return rc
        }
      }
    }
  }

  return ERR_NOT_ENOUGH_RESOURCES
}

cook._sellTerminalsExcess = function () {
  for (const terminal of Game.terminals.values()) {
    if (this._outOfCpu()) break
    this.__sellTerminalExcess(terminal)
  }
}

// called from main after other actors
cook.globalPost = function () {
  if (this._outOfCpu()) return

  this._performTerminalExchange()
  this._operatePowerSpawns()
  this._operateFactories()
  this._sellTerminalsExcess()
}

cook.register()

module.exports = cook
