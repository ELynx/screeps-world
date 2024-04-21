'use strict'

const cookActor =
{
  roomCanHandleNonEnergy: function (room) {
    console.log('TODO roomCanHandleNonEnergy => true')
    return room !== undefined
  },

  roomStructuresWithResouceDemand: function (room) {
    console.log('TODO roomCanHandleNonEnergy => true')
    return room !== undefined ? [] : []
  },

  act: function () {
    console.log('We need to cook')
  }
}

module.exports = cookActor
