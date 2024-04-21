'use strict'

const cookActor =
{
  roomCanHandleNonEnergy: function (room) {
    console.log('TODO roomCanHandleNonEnergy => true')
    return true
  },

  roomCanMine: function (room) {
    console.log('TODO roomCanMine => true')
    return true
  },

  work: function (room) {
    console.log('TODO act => We need to cook / room')
  },

  act: function () {
    console.log('TODO act => We need to cook / global')
  }
}

module.exports = cookActor
