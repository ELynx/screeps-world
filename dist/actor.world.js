'use strict'

const bootstrap = require('./bootstrap')

const taskedAggro = require('./tasked.aggro')
const taskedBeetle = require('./tasked.beetle')
const taskedClaim = require('./tasked.claim')
const taskedObserve = require('./tasked.observe')
const taskedOutlast = require('./tasked.outlast')
const taskedPixel = require('./tasked.pixelgenerator')
const taskedPlunder = require('./tasked.plunder')
const taskedSpawn = require('./tasked.spawn')
const taskedStrelok = require('./tasked.strelok')

// STRATEGY Priority for task execution.
const taskedAuto = [
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
  taskedPixel.id
]

const worldActor =
{
  taskControllersControl: function () {
    for (const id of taskedAuto) {
      const tasked = bootstrap.taskControllers[id]

      if (tasked === undefined) {
        continue
      }

      tasked.act()
    }
  },

  act: function () {
    const t0 = Game.cpu.getUsed()

    this.taskControllersControl()

    if (Game.flags.dashboard) {
      const usedPercent = bootstrap.hardCpuUsed(t0)
      for (const roomName in Game.rooms) {
        const room = Game.rooms[roomName]
        room.visual.rect(11, 0, 5, 0.5, { fill: '#0f0' })
        room.visual.rect(11, 0, 5 * usedPercent / 100, 0.5, { fill: '#f00' })
      }
    }
  } // end of act method
}

module.exports = worldActor
