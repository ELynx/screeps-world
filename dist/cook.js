'use strict'

const bootstrap = require('./bootstrap')

const intentSolver = require('./routine.intent')

// STRATEGY CPU reservation strategy
const PostCPUTarget = Game.cpu.limit - 0.5

const cookActor =
{
  ____prepareDeltaMap: function (something) {
    if (something.__cook__deltaMap === undefined) {
      something.__cook__deltaMap = new Map()
    }
  },

  ___adjustPlannedDelta: function (something, resourceType, delta) {
    this.____prepareDeltaMap(something)
    const now = something.__cook__deltaMap.get(resourceType) || 0
    something.__cook__deltaMap.set(resourceType, now + delta)
  },

  ___plannedDelta: function (something, resourceType) {
    if (something.__cook__deltaMap) {
      return something.__cook__deltaMap.get(resourceType) || 0
    }

    return 0
  },

  __plannedUsedCapacity: function (something, resourceType) {
    const actualWithIntents = intentSolver.getUsedCapacity(something, resourceType)
    const planned = this.___plannedDelta(something, resourceType)

    return actualWithIntents + planned
  },

  __plannedFreeCapacity: function (something, resourceType) {
    const actualWithIntents = intentSolver.getFreeCapacity(something, resourceType)
    const planned = this.___plannedDelta(something, resourceType)

    return actualWithIntents + planned
  },

  __reserveFromStructureToCreep: function (structure, creep, resourceType) {
    const freeSpace = intentSolver.getFreeCapacity(creep, resourceType)
    if (freeSpace <= 0) return

    this.___adjustPlannedDelta(structure, resourceType, -freeSpace)
  },

  __expectFromCreepToStructure: function (structure, creep, resourceType) {
    const usedSpace = intentSolver.getUsedCapacity(creep, resourceType)
    if (usedSpace <= 0) return

    this.___adjustPlannedDelta(structure, resourceType, usedSpace)
  },

  __withdrawFromStructureToCreep: function (structure, creep, resourceType) {
    // TODO -1 to avoid observe
    return intentSolver.wrapCreepIntent(creep, 'withdraw', structure, resourceType)
  },

  __transferFromCreepToStructure: function (structure, creep) {
    // TODO -1 to avoid observe
    return intentSolver.wrapCreepIntent(creep, 'transfer', structure, resourceType)
  },

  _genericHasSpaceFor: function (structure, resourceType, freeSpaceReserve = 0) {
    return this.__plannedFreeCapacity(structure, resourceType) > freeSpaceReserve
  },

  _factoryHasSpaceFor: function (factory, resourceType) {
    // STRATEGY items processed in factory, store reserve
    if (resourceType === RESOURCE_BATTERY || resourceType === RESOURCE_GHODIUM_MELT) {
      return this._genericHasSpaceFor(factory, resourceType, 5000)
    }

    return false
  },

  _labClusterHasSpaceFor: function (labsIterator, resourceType) {
    // TODO
    return false
  },

  _storageHasSpaceFor: function (storage, resourceType) {
    // TODO logic
    return this._genericHasSpaceFor(storage, resourceType)
  },

  _terminalHasSpaceFor: function (terminal, resourceType) {
    // TODO logic
    return this._genericHasSpaceFor(terminal, resourceType)
  },

  // << imitate controller
  id: 'cook',

  actRange: 1,

  roomPrepare: function (room) {
    room.__cook__pass = 0
  },

  observeMyCreep: function (creep) {
    const structure = bootstrap.getObjectById(creep.memory.dest)
    if (!structure) return

    if (creep.memory.xtra) {
      this.__reserveFromStructureToCreep(structure, creep, creep.memory.xtra)
    } else {
      this.__expectFromCreepToStructure(structure, creep)
    }
  },

  act: function (structure, creep) {
    if (creep.memory.xtra) {
      return this.__withdrawFromStructureToCreep(structure, creep, creep.memory.xtra)
    } else {
      return this.__transferFromcreepToStructure(structure, creep)
    }
  },

  _controlPass1: function (room, creeps) {
    // TODO
    return [creeps, []]
  },

  _controlPass2: function (room, creeps) {
    // TODO
    return [creeps, []]
  },

  control: function (room, creeps) {
    ++room.__cook__pass

    if (room.__cook__pass === 1) return this._controlPass1(room, creeps)
    if (room.__cook__pass === 2) return this._controlPass2(room, creeps)

    console.log('Unexpected call to cook::control for room [' + room.name + '] with pass [' + room.__cook_pass + ']')
    return [creeps, []]
  },
  // >>

  roomCanHandle: function (room, resourceType) {
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

    // has space for "stuff"
    if (room.terminal) {
      if (this._terminalHasSpaceFor(room.terminal, resourceType)) return withCache(room, resourceType, true)
    }

    // for reagents lost in transport
    if (this._labClusterHasSpaceFor(room.labs.values(), resourceType)) return withCache(room, resourceType, true)

    // for ghodium lost in transport
    if (room.nuker) {
      if (this._genericHasSpaceFor(room.nuker, resourceType)) return withCache(room, resourceType, true)
    }

    // for "shiny" things only
    if (room.storage) {
      if (this._storageHasSpaceFor(room.storage, resourceType)) return withCache(room, resourceType, true)
    }

    // for power lost in transport
    if (room.powerSpawn) {
      if (this._genericHasSpaceFor(room.powerSpawn, resourceType)) return withCache(room, resourceType, true)
    }

    // if somehow packed resources of interest
    if (room.factory) {
      if (this._factoryHasSpaceFor(room.factory, resourceType)) return withCache(room, resourceType, true)
    }

    return withCache(room, resourceType, false)
  },

  roomCanMine: function (room) {
    if (!room._my_) {
      console.log('Unexpected call to cook::roomCanMine for room [' + room.name + '] => false')
      return false
    }

    // no cooking without ingredient exchange
    if (room.terminal === undefined) return false

    const mineralType = room.mineralType()
    if (mineralType === '') return false

    return this._terminalHasSpaceFor(room.terminal, mineralType) || this._labClusterHasSpaceFor(room.labs.values(), mineralType)
  },

  _operateHarvesters: function (room) {
    // TODO
  },

  _operateLinks: function (room) {
    // TODO
  },

  // called from room actor after controllers
  roomPost: function (room) {
    this._operateHarvesters(room)
    this._operateLinks(room)
  },

  __outOfCpu: function () {
    return Game.cpu.getUsed() >= PostCPUTarget
  },

  _performTerminalExchange: function () {
    // TODO
  },

  __operatePowerSpawn: function (powerSpawn) {
    if (powerSpawn.store.getUsedCapacity(RESOURCE_POWER) >= 1 &&
        powerSpawn.store.getUsedCapacity(RESOURCE_ENERGY) >= 50) {
      return powerSpawn.processPower()
    }

    return ERR_NOT_ENOUGH_RESOURCES
  },

  _operatePowerSpawns: function () {
    for (const powerSpawn of Game.powerSpawns.values()) {
      if (this.__outOfCpu()) break
      this.__operatePowerSpawn(powerSpawn)
    }
  },

  __operateFactory: function (factory) {
    if (factory.cooldown && factory.cooldown > 0) {
      return ERR_TIRED
    }

    // fast check to cover any recepies
    if (factory.store.getUsedCapacity() <= 0) {
      return ERR_NOT_ENOUGH_RESOURCES
    }

    if (factory.store.getUsedCapacity(RESOURCE_GHODIUM_MELT) >= 100 &&
        factory.store.getUsedCapacity(RESOURCE_ENERGY) >= 200) {
      return factory.produce(RESOURCE_GHODIUM)
    }

    if (factory.store.getUsedCapacity(RESOURCE_BATTERY) >= 50) {
      return factory.produce(RESOURCE_ENERGY)
    }

    return ERR_NOT_ENOUGH_RESOURCES
  },

  _operateFactories: function () {
    for (const factory of Game.factories.values()) {
      if (this.__outOfCpu()) break
      this.__operateFactory(factory)
    }
  },

  __sellTerminalExcess: function (terminal) {
    // TODO
  },

  _sellTerminalsExcess: function () {
    for (const terminal of Game.terminals.values()) {
      if (this.__outOfCpu()) break
      this._sellTerminalsExcess(terminal)
    }
  },

  // called from main after other actors
  globalPost: function () {
    if (this.__outOfCpu()) return

    this._performTerminalExchange()
    this._operatePowerSpawns()
    this._operateFactories()
    this._sellTerminalsExcess()
  }
}

bootstrap.registerRoomController(cookActor)

module.exports = cookActor
