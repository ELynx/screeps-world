'use strict'

const bootstrap = require('./bootstrap')

const intentSolver = require('./routine.intent')

const Controller = require('./controller.template')
const intent = require('./routine.intent')

const cook = new Controller('cook')

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
  // TODO ___roomSupply
  return intent.getUsedCapacity(structure, resourceType)
}

cook.__hasSupply = function (structure, resourceType) {
  // save typing down the line
  if (structure === undefined) return false

  const supply = this.___roomSupply(structure, resourceType)
  const planned = this.___plannedDelta(structure, resourceType)

  return supply + planned > 0
}

cook.___worldSupply = function (structure, resourceType) {
  const roomSupply = this.___roomSupply(structure, resourceType)
  // STRATEGY histeresis on resource movement
  if (roomSupply <= 1000) return 0

  return roomSupply
}

cook.___worldExcess = function (structure, resourceType) {
  if (resourceType !== RESOURCE_ENERGY) {
    if (this.___roomNeedResource(structure.room, resourceType)) return 0
    return this.___worldSupply(structure, resourceType)
  }

  const roomSupply = this.___roomSupply(structure, resourceType)
  // STRATEGY histeresis on resource movement
  if (roomSupply <= SOURCE_ENERGY_CAPACITY) return 0

  return roomSupply
}

cook.___roomDemand = function (structure, resourceType) {
  // TODO ___roomDemand
  if (resourceType === RESOURCE_ENERGY) {
    return intentSolver.getFreeCapacity(structure, resourceType)
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
  // TODO ___roomSpace
  return intentSolver.getFreeCapacity(structure, resourceType)
}

// expected that if this returns true, _hasDemand returns true as well
cook._hasSpace = function (structure, resourceType) {
  // save typing down the line
  if (structure === undefined) return false

  const space = this.___roomSpace(structure, resourceType)
  const planned = this.___plannedDelta(structure, resourceType)

  return space > planned
}

cook._labClusterDemandTarget = function (room, resourceType) {
  for (const lab of room.labs.values()) {
    if (this._hasDemand(lab, resourceType)) return [lab, resourceType]
  }

  return [undefined, resourceType]
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

cook._reserveFromStructureToCreep = function (structure, creep, resourceType) {
  const freeSpace = intentSolver.getFreeCapacity(creep, resourceType)
  if (freeSpace <= 0) return

  this.__adjustPlannedDelta(structure, resourceType, -1 * freeSpace)
}

cook._expectFromCreepToStructure = function (structure, creep) {
  for (const resourceType in creep.store) {
    const usedSpace = intentSolver.getUsedCapacity(creep, resourceType)
    if (usedSpace <= 0) continue

    this.__adjustPlannedDelta(structure, resourceType, usedSpace)
  }
}

cook.__withdrawFromStructureToCreep = function (structure, creep, resourceType) {
  const canTake = creep.store.getFreeCapacity(resourceType)
  if (canTake <= 0) return ERR_FULL

  const wantGive = this.___roomSupply(structure, resourceType)
  if (wantGive <= 0) return ERR_NOT_ENOUGH_RESOURCES

  const amount = Math.min(canTake, wantGive)

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

  const canGive = intentSolver.getUsedCapacity(creep, resourceType)
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
  if (someLab !== undefined && someResourceType !== undefined) return [someLab, someResourceType]
  if (this._hasDemand(room.terminal, resourceType)) return [room.terminal, resourceType]

  // just unload
  if (this._hasSpace(room.storage)) return [room.storage, resourceType]
  if (this._hasSpace(room.factory)) return [room.factory, resourceType]
  if (this._hasSpace(room.terminal)) return [room.terminal, resourceType]

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
    const energy = intentSolver.getUsedCapacity(creep, RESOURCE_ENERGY)
    const total = intentSolver.getUsedCapacity(creep)

    if (total <= 0) {
      empty.push(creep)
      continue
    }

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
  }

  room.__cook__energyRestockSources = sources
  return sources
}

cook.___roomNeedResource = function (room, resourceType) {
  if (this.___roomDemand(room.factory, resourceType)) return true

  for (const lab of room.labs.values()) {
    if (this.___roomDemand(lab, resourceType)) return true
  }

  if (this.___roomDemand(room.nuker, resourceType)) return true
  if (this.___roomDemand(room.powerSpawn, resourceType)) return true
  if (this.___roomDemand(room.storage, resourceType)) return true
  if (this.___roomDemand(room.terminal, resourceType)) return true

  return false
}

cook.__resourceRestockSources = function (room, count) {
  if (count === 0) return []

  const sources = []

  // force flush containers
  for (const container of room.__cook__containers) {
    const stored = _.shuffle(_.keys(container.store))
    if (!_.every(stored, _.matches(RESOURCE_ENERGY))) {
      for (const resourceType of stored) {
        if (resourceType === RESOURCE_ENERGY) continue

        if (this.__hasSupply(container, resourceType)) {
          container.__cook__resourceToTake = resourceType
          sources.push(container)
          break // from stored loop
        }
      }
    }

    if (sources.length >= count) return sources
  }

  const pushStore = structure => {
    const stored = _.shuffle(_.keys(structure.store))
    for (const resourceType of stored) {
      if (resourceType === RESOURCE_ENERGY) continue

      if (!this.__hasSupply(structure, resourceType)) continue

      if (this.___roomNeedResource(room, resourceType)) {
        structure.__cook__resourceToTake = resourceType
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

  return sources
}

cook.__prio3EnergyRestockTargets = function (room, count) {
  if (count === 0) return []

  const targets = []

  if (this.__hasEnergyDemand(room.terminal)) targets.push(room.terminal)
  if (targets.length >= count) return targets

  for (const lab of room.labs.values()) {
    if (this.__hasEnergyDemand(lab)) {
      targets.push(lab)
      if (targets.length >= count) return targets
    }
  }

  if (this.__hasEnergyDemand(room.nuker)) targets.push(room.nuker)
  if (targets.length >= count) return targets

  if (this.__hasEnergyDemand(room.powerSpawn)) targets.push(room.powerSpawn)
  if (targets.length >= count) return targets

  if (this.__hasEnergyDemand(room.factory)) targets.push(room.factory)
  if (targets.length >= count) return targets

  if (this.__hasEnergyDemand(room.storage)) targets.push(room.storage)

  return targets
}

cook.extra = function (target) {
  return target.__cook__resourceToTake
}

cook._controlPass2 = function (room, creeps) {
  // transfer energy reserves from containers to links
  for (const link of room.links.values()) {
    if (!link.isSource()) continue

    const canTake = intentSolver.getFreeCapacity(link, RESOURCE_ENERGY)
    if (canTake <= 0) continue

    for (const creep of creeps) {
      if (creep.memory.btyp !== 'harvester') continue
      if (!creep.pos.isNearTo(link)) continue

      const canGive = intentSolver.getUsedCapacity(creep, RESOURCE_ENERGY)
      if (canGive <= 0) {
        const amount = Math.min(canTake, canGive)
        const rc = this.wrapIntent(creep, 'transfer', link, RESOURCE_ENERGY, amount)
        if (rc >= OK) {
          creep.__cook__pass2__used = true
          break // from creeps loop
        }
      } else {
        for (const container of room.__cook__containers) {
          if (!creep.pos.isNearTo(container)) continue
          if (intentSolver.getUsedCapacity(container, RESOURCE_ENERGY) <= 0) continue

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

      if (this._hasCM && this._isEmpty(creep)) {
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
          // eslint-disable-next-line no-unused-vars
          const [unused, used] = this.assignCreeps(room, transports, energyRestockSources)
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

cook._askForEnergyIfNeeded = function (room) {
  if (!room._my_) return
  if (!room.terminal) return
  if (room.memory.slvl > 1) return

  if (this.__hasSupply(room.terminal, RESOURCE_ENERGY)) return

  this.___addWorldDemand(room.terminal, RESOURCE_ENERGY, SOURCE_ENERGY_CAPACITY)
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

  for (const harvester in harvesters) {
    let clusterContainers = _.filter(containers, container => container.isNearTo(harvester._source_))
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
      // unload to containers only when there is more energy in source
      // otherwise continue to next harvester
      const hrc = harvester._source_harvest_specialist_rc_
      if (hrc === bootstrap.WARN_BOTH_EXHAUSED) continue
      if (hrc === bootstrap.WARN_INTENDED_EXHAUSTED) continue
      if (hrc === bootstrap.ERR_INTENDED_EXHAUSTED) continue
      if (hrc === ERR_NOT_ENOUGH_RESOURCES) continue

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
    const energy = this.__plannedUsedCapacity(someLink, RESOURCE_ENERGY)
    // to avoid frantic sends
    return energy >= LinkSourceTreshold
  }

  const useAsDest = someLink => {
    // cut off transfer, due to losses it is never 100% full
    return someLink.store.getFreeCapacity(RESOURCE_ENERGY) > LinkDestinationTreshold
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
      return l2.store[RESOURCE_ENERGY] - l1.store[RESOURCE_ENERGY]
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

  const inputLabs = []
  const outputLabs = []

  for (const lab of room.labs.values()) {
    if (lab.isSource()) {
      inputLabs.push(lab)
    } else {
      outputLabs.push(lab)
    }
  }

  if (inputLabs.length < 2) return
  if (inputLabs.length > 2) {
    console.log('Unexpected number of input labs in room [' + room.name + ']. Found [' + inputLabs.length + '] input labs')
    return
  }

  // detect when no reaction possible
  for (const lab of inputLabs) {
    if (lab.mineralType === undefined) return
    if (lab.store.getUsedCapacity(lab.mineralType) <= 0) return
  }

  // STRATEGY how much labs can fire at the same tick by default
  const cookedMax = room.memory.cook || 1
  let cooked = 0
  for (const lab of outputLabs) {
    if (lab.cooldown && lab.cooldown > 0) continue

    if (lab.mineralType) {
      if (lab.store.getFreeCapacity(lab.mineralType) <= 0) continue
    }

    const rc = lab.runReaction(inputLabs[0], inputLabs[1])
    if (rc >= OK) ++cooked

    if (cooked >= cookedMax) return
  }
}

// called from room actor after controllers
cook.roomPost = function (room) {
  this._askForEnergyIfNeeded(room)
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

  // TODO? sort by proximity

  let sourceTerminal
  let sourceType
  let sourceSupply

  for (const terminal of allTerminals) {
    if (terminal.id === targetTerminal.id) continue
    if (terminal._operated_) continue
    if (terminal.cooldown && terminal.cooldown > 0) continue

    for (const resourceType of demandTypes) {
      const excessAmount = this.___worldExcess(terminal, resourceType)
      if (excessAmount > 0) {
        sourceTerminal = terminal
        sourceType = resourceType
        sourceSupply = excessAmount
        break
      }
    }
  }

  if (sourceTerminal === undefined) {
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
          break
        }
      }
    }
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

  if (factory.store.getUsedCapacity(RESOURCE_GHODIUM_MELT) >= 100 &&
      factory.store.getUsedCapacity(RESOURCE_ENERGY) >= 200) {
    return factory.produce(RESOURCE_GHODIUM)
  }

  if (factory.store.getUsedCapacity(RESOURCE_BATTERY) >= 50) {
    return factory.produce(RESOURCE_ENERGY)
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

cook.__sellTerminalExcess = function (terminal) {
  if (terminal._operated_) {
    return ERR_TIRED
  }

  if (terminal.cooldown && terminal.cooldown > 0) {
    return ERR_TIRED
  }

  const resourceTypes = _.shuffle(_.keys(terminal.store))
  for (const resourceType of resourceTypes) {
    const excess = this.___worldExcess(terminal, resourceType)
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
