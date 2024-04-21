'use strict'

const cookActor =
{
  roomCanHandleNonEnergy: function (room) {
    console.log('TODO roomCanHandleNonEnergy => true')
    return true
  },

  validateRoomStructuresWithResouceDemand: function (allTargets, target, creep) {
    console.log('TODO validateRoomStructuresWithResouceDemand => true')
    return true
  },

  roomStructuresWithResouceDemand: function (room) {
    console.log('TODO roomStructuresWithResouceDemand => true')
    return []
  },

  act: function () {
    console.log('TODO act => We need to cook')
  }
}

module.exports = cookActor
