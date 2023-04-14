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
  cleanup.cleanup()
  extensions.shortcuts()

  historyActor.act()

  // prevent division by zero
  const totalCreepsCount = Math.max(1, Game.__totalCreeps)

  const roomValues = _.shuffle(Game.__roomValues)
  for (const room of roomValues) {
    room.__cpuLimit = Math.ceil(100 * room.__roomCreeps / totalCreepsCount)

    if (room._my_) {
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
