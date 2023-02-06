'use strict'

const bootstrap = require('./bootstrap')

/* eslint-disable no-unused-vars */
/**
Order of load is priority for task execution.
**/
// generate spawn(s)
const taskedOutlast = require('./tasked.outlast') // very tick-sensitive logic, run first
const taskedBeetle = require('./tasked.beetle') // generates aggro
const taskedStrelok = require('./tasked.strelok') // consumes aggro
const taskedPlunder = require('./tasked.plunder') // paramilitary
const taskedClaim = require('./tasked.claim') // one-off
const taskedObserve = require('./tasked.observe') // lowest prio
// consume spawn(s)
const taskedSpawn = require('./tasked.spawn')
// other
const taskedPixel = require('./tasked.pixelgenerator')
/* eslint-enable no-unused-vars */

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
          room.__breached
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
    for (const id in bootstrap.taskControllers) {
      bootstrap.taskControllers[id].act()
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
