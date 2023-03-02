'use strict'

// standalone
const iff = require('./iff')
const profiler = require('./screeps-profiler')

const cleanup = require('./routine.cleanup')
const extensions = require('./extensions')
const historyActor = require('./actor.history')
const roomActor = require('./actor.room')
const worldActor = require('./actor.world')

console.log('T: ' + Game.time + ' Loading took ' + Game.cpu.getUsed() + ' CPU')
console.log('Lodash version ' + _.VERSION + ' documented at https://lodash.com/docs/' + _.VERSION)

// enable profiler with a flag on map during load
if (Game.flags.profiler && Game.flags.profiler.pos) {
  console.log('Profiler enabled by flag in room ' + Game.flags.profiler.pos.roomName)

  profiler.registerObject(iff, 'iff')
  profiler.registerObject(cleanup, 'cleanup')
  profiler.registerObject(extensions, 'extensions')
  profiler.registerObject(historyActor, 'historyActor')
  profiler.registerObject(roomActor, 'roomActor')
  profiler.registerObject(worldActor, 'worldActor')

  profiler.enable()
} else {
  profiler.disable()
}

module.exports.loop = function () {
  profiler.wrap(function () {
    iff.convenience()
    Game.iff.setVerbose(true)

    cleanup.cleanup()
    extensions.shortcuts()

    historyActor.act()

    // prevent division by zero
    const total = Math.max(1, _.keys(Game.creeps).length)

    const roomNames = _.shuffle(_.keys(Game.rooms))
    for (const roomName of roomNames) {
      const room = Game.rooms[roomName]

      // STRATEGY CPU limit allocation for controlled vs other rooms
      const r = _.keys(room.creeps).length * (room.my ? 3 : 2)
      const t = total
      const limit = Math.ceil(100 * r / t)

      room.visual.rect(5.5, 0, 5, 0.5, { fill: '#0f0' })
      room.visual.rect(5.5, 0, 5 * r / t, 0.25, { fill: '#03f' })

      if (room.my) {
        room.memory.cpul = limit
        roomActor.act(room)
      } else if (Game.flags['observe_act_' + room.name] &&
                 Game.flags['observe_act_' + room.name].pos.roomName === room.name) {
        room.memory.cpul = limit
        roomActor.act(room)
      } else {
        room.memory.cpul = undefined
      }
    }

    worldActor.act()
  })
}
