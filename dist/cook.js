'use strict'

const bootstrap = require('./bootstrap')

const cookActor =
{
  _storageHasSpaceFor: function (storage, resourceType) {
    // TODO
    return false
  },

  _terminalHasSpaceFor: function (terminal, resourceType) {
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

    if (room.storage) {
      if (this._storageHasSpaceFor(room.storage, resourceType)) return true
    }

    if (room.terminal) {
      if (this._terminalHasSpaceFor(room.terminal, resourceType)) return true
    }

    return false
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
    // TODO send resources across rooms
    // TODO send energy across rooms
    console.log('TODO globalPost')
  }
}

bootstrap.registerRoomController(cookActor)

module.exports = cookActor
