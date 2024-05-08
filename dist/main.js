'use strict'

const historyActor = require('./actor.history')
const roomActor = require('./actor.room')
const taskedActor = require('./actor.tasked')

const cook = require('./cook')
const extensions = require('./extensions')
const iff = require('./iff')

const cleanup = require('./routine.cleanup')

console.log('T: ' + Game.time + ' Loading took ' + Game.cpu.getUsed() + ' CPU')
// console.log('Lodash version ' + _.VERSION + ' documented at https://lodash.com/docs/' + _.VERSION)

let profiler

// load and enable profiler with a flag on map during load
if (Game.flags.profiler) {
  console.log('Profiler enabled by flag at ' + Game.flags.profiler.pos)

  profiler = require('./screeps-profiler')

  profiler.registerObject(historyActor, 'historyActor')
  profiler.registerObject(roomActor, 'roomActor')
  profiler.registerObject(taskedActor, 'taskedActor')
  profiler.registerObject(cook, 'cook')
  profiler.registerObject(extensions, 'extensions')
  profiler.registerObject(iff, 'iff')
  profiler.registerObject(cleanup, 'cleanup')

  profiler.enable()
}

const loop = function () {
  iff.convenience()
  cleanup.cleanup()
  extensions.shortcuts()

  historyActor.act()

  // prevent division by zero
  const myCreepsCount = Math.max(1, Game.myCreepsCount)

  const roomValues = _.shuffle(Game.rooms_values)
  for (const room of roomValues) {
    room._cpuLimit_ = Math.ceil(100 * room.myCreepsCount / myCreepsCount)

    if (room._my_) {
      roomActor.act(room)
    } else {
      const actFlag = Game.flags['observe_act_' + room.name]

      if (actFlag && actFlag.pos.roomName === room.name) {
        roomActor.act(room)
      }
    }
  }

  taskedActor.act()

  cook.globalPost()

  // a sneaky way to run some arbitrary code on every tick without reloading
  if (Memory.eval) {
    try {
      // eslint-disable-next-line no-eval
      eval(Memory.eval)
    } catch {
      // cannot be fixed even from console, because execution dies
      // fix here
      Memory.eval = undefined
    }
  }
}

let loopOfChoice

if (profiler) {
  loopOfChoice = _.bind(profiler.wrap, null, loop)
} else {
  loopOfChoice = loop
}

module.exports.loop = loopOfChoice
