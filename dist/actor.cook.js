'use strict'

const cookActor =
{
  roomCanHandleNonEnergy: function (room) {
    console.log('TODO roomCanHandleNonEnergy => false')
    return false
  },

  roomCanMine: function (room) {
    console.log('TODO roomCanMine => false')
    return false
  },

  work: function (room) {
    console.log('TODO act => We need to cook / room')
  },

  act: function () {
    console.log('TODO act => We need to cook / global')
  }
}

module.exports = cookActor
