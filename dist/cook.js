'use strict'

const bootstrap = require('./bootstrap')

const cookActor =
{
  // << imitate controller
  id: "cook",

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

  // if room can accept (more) resources that are not energy
  roomCanHandleNonEnergy: function (room) {
    console.log('TODO roomCanHandleNonEnergy => false')
    return false
  },

  // if room can start and do mining
  roomCanMine: function (room) {
    console.log('TODO roomCanMine => false')
    return false
  },

  // called from room actor before controllers
  work: function (room) {
    console.log('TODO work')
  },

  // called from main after other actors
  actGlobal: function () {
    console.log('TODO actGlobal')
  }
}

bootstrap.registerRoomController(cookActor)

module.exports = cookActor
