'use strict'

const bootstrap = require('./bootstrap')

const cookActor =
{
  __used: function (structure, resourceType) {
    // TODO smarter
    const fromApi = structure.store.getUsedCapacity(resourceType)
    if (fromApi === null) return 0
    return fromApi || 0
  },

  __free: function (structure, resourceType) {
    // TODO smarter
    const fromApi = structure.store.getFreeCapacity(resourceType)
    if (fromApi === null) return 0
    return fromApi || 0
  },

  _genericHasSpaceFor: function (structure, resourceType, reserve = 0) {
    return this.__free(structure, resourceType) > reserve
  },

  _factoryHasSpaceFor: function (factory, resourceType) {
    // STRATEGY items processed in factory, store reserve
    if (resourceType === RESOURCE_BATTERY || resourceType === RESOURCE_GHODIUM_MELT) {
      return this._genericHasSpaceFor(factory, resourceType, 5000)
    }

    return false
  },

  _labHasSpaceFor: function (lab, resourceType) {
    if (resourceType === RESOURCE_ENERGY || resourceType === lab.resourceType()) {
      return this._genericHasSpaceFor(lab, resourceType)
    }

    return false
  },

  _storageHasSpaceFor: function (storage, resourceType) {
    // TODO logic
    return this._rgenericHasSpaceFor(storage, resourceType)
  },

  _terminalHasSpaceFor: function (terminal, resourceType) {
    // TODO logic
    return this._genericHasSpaceFor(terminal, resourceType)
  },

  // << imitate controller
  id: 'cook',

  actRange: 1,

  roomPrepare: function (room) {
    console.log('TODO roomPrepare')
  },

  observeMyCreep: function (creep) {
    console.log('TODO observeMyCreep')
  },

  act: function (target, creep) {
    console.log('TODO act => -1')
    return -1
  },

  control: function (room, creeps) {
    console.log('TODO control => [[as-is],[]]')
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

    // has space for "sell stuff out"
    if (room.terminal) {
      if (this._terminalHasSpaceFor(room.terminal, resourceType)) return withCache(room, resourceType, true)
    }

    // likely can pick up reaction spill
    for (const lab of Array.from(room.labs.values())) {
      if (this._labHasSpaceFor(lab, resourceType)) return withCache(room, resourceType, true)
    }

    // likely can pick up transit spill
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

    if (room.terminal === undefined) return false

    const mineralType = room.mineralType()
    if (mineralType === '') return false

    return this._terminalHasSpaceFor(room.terminal, mineralType)
  },

  // called from room actor after controllers
  roomPost: function (room) {
    // TODO links
    // TODO harvester unload
    console.log('TODO roomPost')
  },

  // called from main after other actors
  globalPost: function () {
    // TODO exchange across rooms
    // TODO sell of excess from terminals
    console.log('TODO globalPost')
  }
}

bootstrap.registerRoomController(cookActor)

module.exports = cookActor
