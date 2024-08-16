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
const taskedStrelokFamily = require('./tasked.strelok')

const taskedVip = [
]

// STRATEGY Priority for task execution.
const taskedDefault = [
  // generate spawn(s)
  taskedOutlast.id, // very tick-sensitive logic, run first
  taskedAggro.id, // generates aggro and breach
  taskedBeetle.id, // generates aggro
  taskedStrelokFamily.strelok.id, // consumes aggro
  taskedStrelokFamily.patrol.id, // consumes aggro
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
  taskControllersControl (ids) {
    for (const id of ids) {
      const tasked = bootstrap.taskControllers.get(id)
      if (!tasked) continue

      tasked.act()
    }
  },

  vip () {
    this.taskControllersControl(taskedVip)
  },

  act () {
    this.taskControllersControl(taskedDefault)
  }
}

module.exports = taskedActor
