'use strict'

const bootstrap = require('./bootstrap')

const cookActor =
{
  _terminalHasSpaceFor: function (terminal, resourceType) {
    // TODO
    return false
  },

  _storageHasSpaceFor: function (storage, resourceType) {
    // TODO
    return false
  },

  _labHasSpaceFor: function (structure, resourceType) {
    // TODO
    return false
  },

  _genericHasSpaceFor: function (structure, resourceType) {
    // TODO
    return false
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

    withCache = (x, key, value) => {
      x.__cook__roomCanHandle.set(key, value)
      return value
    }

    if (room.terminal) {
      if (this._terminalHasSpaceFor(room.terminal, resourceType)) return withCache(room, resourceType, true)
    }

    if (room.storage) {
      if (this._storageHasSpaceFor(room.storage, resourceType)) return withCache(room, resourceType, true)
    }

    for (const lab of Array.from(room.labs)) {
      if (this._labHasSpaceFor(lab, resourceType)) return withCache(room, resourceType, true)
    }

    if (room.nuker) {
      if (this._genericHasSpaceFor(room.nuker, resourceType)) return withCache(room, resourceType, true)
    }

    if (room.powerSpawn) {
      if (this._genericHasSpaceFor(room.powerSpawn, resourceType)) return withCache(room, resourceType, true)
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
