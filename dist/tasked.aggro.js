'use strict'

const Tasked = require('./tasked.template')

const aggro = new Tasked('aggro')

aggro.act = function () {
  // TODO by flag to allow multi-aggro
  for (const roomName in Game.rooms) {
    const room = Game.rooms[roomName]

    const flag = Game.flags['aggro_' + roomName]
    if (flag) {
      // TODO not roads
      room.__aggro = _.filter(flag.pos.lookFor(LOOK_STRUCTURES), _.property('hits'))

      for (const index in room.__aggro) {
        room.__aggro[index].__aggro = true
      }

      if (room.__aggro.length === 0) {
        room.__breached = true
      } else {
        room.__breached = false
      }
    } else {
      room.__aggro = []
    }
  }
}

aggro.register()

module.exports = aggro
