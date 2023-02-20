'use strict'

const bootstrap = require('./bootstrap')

const taskedBeetle = require('./tasked.beetle')
const taskedClaim = require('./tasked.claim')
const taskedEconomist = require('./tasked.economist')
const taskedObserve = require('./tasked.observe')
const taskedOutlast = require('./tasked.outlast')
const taskedPixel = require('./tasked.pixelgenerator')
const taskedPlunder = require('./tasked.plunder')
const taskedSpawn = require('./tasked.spawn')
const taskedStrelok = require('./tasked.strelok')

// STRATEGY Priority for task execution.
const automaticControllers = [
  // generate spawn(s)
  taskedOutlast.id, // very tick-sensitive logic, run first
  taskedBeetle.id, // generates aggro
  taskedStrelok.id, // consumes aggro
  taskedPlunder.id, // paramilitary
  taskedClaim.id, // post-militray
  taskedObserve.id, // lowest prio
  // consume spawn(s)
  taskedSpawn.id,
  // other
  taskedEconomist.id,
  taskedPixel.id
]

const worldActor =
{
  verbose: false,

  debugLine: function (room, what) {
    if (this.verbose) {
      room.roomDebug(what)
    }
  },

  giveOutAggro: function () {
    for (const roomName in Game.rooms) {
      const room = Game.rooms[roomName]

      const flag = Game.flags['aggro_' + roomName]
      if (flag) {
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
  },

  /**
    Let task controllers do theit jobs.
    **/
  taskControllersControl: function () {
    for (const index in automaticControllers) {
      const id = automaticControllers[index]
      const automaticController = bootstrap.taskControllers[id]

      if (automaticController === undefined) {
        continue
      }

      automaticController.act()
    }
  },

  /**
    Execute world level logic.
    **/
  act: function () {
    // mark initial time
    const t0 = Game.cpu.getUsed()

    this.giveOutAggro()
    this.taskControllersControl()

    const usedPercent = bootstrap.hardCpuUsed(t0)
    for (const roomName in Game.rooms) {
      const room = Game.rooms[roomName]
      this.debugLine(room, 'HCPU: ' + usedPercent + '% on world actor')
      room.visual.rect(11, 0, 5, 0.5, { fill: '#0f0' })
      room.visual.rect(11, 0, 5 * usedPercent / 100, 0.5, { fill: '#f00' })
    }
  } // end of act method
}

module.exports = worldActor
