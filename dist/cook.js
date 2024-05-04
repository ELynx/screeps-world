'use strict'

const bootstrap = require('./bootstrap')

const cookActor =
{
  id: "cook",

  roomCanHandleNonEnergy: function (room) {
    console.log('TODO roomCanHandleNonEnergy => false')
    return false
  },

  roomCanMine: function (room) {
    console.log('TODO roomCanMine => false')
    return false
  },

  work: function (room) {
    console.log('TODO work => We need to cook / room')
  },

  act: function () {
    console.log('TODO act => We need to cook / global')
  }
}

bootstrap.registerRoomController(cookActor)

module.exports = cookActor
