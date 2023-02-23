'use strict'

// standalone
const iff = require('./iff')
const profiler = require('./screeps-profiler')

/* eslint-disable no-unused-vars */
const extensions = require('./extensions')
/* eslint-enable no-unused-vars */

const historyActor = require('./actor.history')
const cleanup = require('./routine.cleanup')
const roomActor = require('./actor.room')
const worldActor = require('./actor.world')

console.log('T: ' + Game.time + ' Loading took ' + Game.cpu.getUsed() + ' CPU')
console.log('Lodash version ' + _.VERSION + ' documented at https://lodash.com/docs/' + _.VERSION)

// enable profiler with a flag on map during load
if (Game.flags.profiler && Game.flags.profiler.pos) {
  console.log('Profiler enabled by flag in room ' + Game.flags.profiler.pos.roomName)

  profiler.registerObject(iff, 'iff')
  profiler.registerObject(historyActor, 'historyActor')
  profiler.registerObject(cleanup, 'cleanup')
  profiler.registerObject(roomActor, 'roomActor')
  profiler.registerObject(worldActor, 'worldActor')

  profiler.enable()
} else {
  profiler.disable()
}

module.exports.loop = function () {
  profiler.wrap(function () {
    iff.convenience()
    iff.setVerbose(Game.flags.verbose !== undefined)

    // history acts before clean-up because it relies on memory of dead
    historyActor.act()

    cleanup.cleanup()

    const limits = { }
    let total = 0

    for (const creepName in Game.creeps) {
      const creep = Game.creeps[creepName]
      const room = creep.room

      // STRATEGY limit weight for controlled vs other rooms, per creep
      const delta = room.my ? 3 : 2

      let now = limits[room.name] || 0
      now = now + delta
      limits[room.name] = now

      total = total + delta
    }

    if (total === 0) total = 1

    for (const roomName in Game.rooms) {
      const room = Game.rooms[roomName]

      const r = limits[room.name] || 0
      const t = total
      const limit = Math.ceil(100 * r / t)

      room.visual.rect(5.5, 0, 5, 0.5, { fill: '#0f0' })
      room.visual.rect(5.5, 0, 5 * r / t, 0.25, { fill: '#03f' })

      // save CPU on all rooms where control is not needed
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
