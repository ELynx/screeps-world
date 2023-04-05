'use strict'

// standalone
const iff = require('./iff')

const cleanup = require('./routine.cleanup')
const extensions = require('./extensions')
const demandAndSupply = require('./routine.dns') // eslint-disable-line no-unused-vars
const historyActor = require('./actor.history')
const roomActor = require('./actor.room')
const worldActor = require('./actor.world')

console.log('T: ' + Game.time + ' Loading took ' + Game.cpu.getUsed() + ' CPU')
console.log('Lodash version ' + _.VERSION + ' documented at https://lodash.com/docs/' + _.VERSION)

let profiler

// load and enable profiler with a flag on map during load
if (Game.flags.profiler) {
  console.log('Profiler enabled by flag at ' + Game.flags.profiler.pos)

  profiler = require('./screeps-profiler')

  profiler.registerObject(iff, 'iff')
  profiler.registerObject(cleanup, 'cleanup')
  profiler.registerObject(extensions, 'extensions')
  profiler.registerObject(historyActor, 'historyActor')
  profiler.registerObject(roomActor, 'roomActor')
  profiler.registerObject(worldActor, 'worldActor')

  profiler.enable()
}

const loop = function () {
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

    room.__cpuLimit = Math.ceil(100 * r / t)

    if (room.my) {
      roomActor.act(room)
    } else {
      const actFlag = Game.flags['observe_act_' + room.name]

      if (actFlag && actFlag.pos.roomName === room.name) {
        roomActor.act(room)
      }
    }
  }

  worldActor.act()
}

let loopOfChoice

if (profiler) {
  loopOfChoice = _.bind(profiler.wrap, null, loop)
} else {
  loopOfChoice = loop
}

module.exports.loop = loopOfChoice
