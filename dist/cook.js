'use strict'

const bootstrap = require('./bootstrap')

const cookActor =
{
  _terminalHasSpaceFor: function (terminal, type = undefined) {
    // TODO
    return false
  },

  _storageHasSpaceFor: function (storage, type = undefined) {
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

  // if room can accept resources that are not energy
  roomCanHandleNonEnergy: function (room) {
    if (!room._my_) return false

    if (room.storage) {
      if (this._storageHasSpaceFor(room.storage)) return true
    }

    if (room.terminal) {
      if (this._terminalHasSpaceFor(room.terminal)) return true
    }

    return false
  },

  // if room can do mining
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
