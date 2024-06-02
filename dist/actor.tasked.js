'use strict'

const bootstrap = require('./bootstrap')

const taskedAggro = require('./tasked.aggro')
const taskedBeetle = require('./tasked.beetle')
const taskedClaim = require('./tasked.claim')
const taskedNuker = require('./tasked.nuker')
const taskedObserve = require('./tasked.observe')
const taskedOutlast = require('./tasked.outlast')
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
  // generate nuke(s)
  taskedNuker.id
]

const taskedActor =
{
  taskControllersControl () {
    for (const id of taskedAuto) {
      const tasked = bootstrap.taskControllers[id]
      if (tasked === undefined) continue

      tasked.act()
    }
  },

  act () {
    this.taskControllersControl()
  }
}

module.exports = taskedActor
