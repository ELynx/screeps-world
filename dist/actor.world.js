'use strict'

const bootstrap = require('./bootstrap')

const taskedAggro = require('./tasked.aggro')
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
  taskedAggro.id, // generates aggro and breach
  taskedBeetle.id, // generates aggro
  taskedStrelok.id, // consumes aggro
  taskedPlunder.id, // paramilitary
  taskedClaim.id, // a bit paramilitary
  taskedObserve.id, // lowest prio
  // consume spawn(s)
  taskedSpawn.id,
  // other
  taskedEconomist.id,
  taskedPixel.id
]

const worldActor =
{
  debugLine: function (room, what) {
    if (Game.flags.verbose) {
      room.roomDebug(what)
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
