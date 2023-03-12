'use strict'

const profiler = require('./screeps-profiler')

const bootstrap = require('./bootstrap')

function Process (id) {
  this.id = id

  this.work = undefined

  this._register = function () {
    bootstrap.registerProcessController(this)

    if (Game.flags.profiler && Game.flags.profiler.pos) {
      profiler.registerObject(this, this.id)
    }
  }

  this.register = function () {
    this._register()
  }
}

module.exports = Process
