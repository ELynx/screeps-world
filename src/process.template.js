'use strict'

let profiler

if (Game.flags.profiler) {
  profiler = require('./screeps-profiler')
}

const bootstrap = require('./bootstrap')

function Process (id) {
  this.id = id

  this.work = undefined

  this._register = function () {
    bootstrap.registerProcessController(this)

    if (profiler) {
      profiler.registerObject(this, this.id)
    }
  }

  this.register = function () {
    this._register()
  }
}

module.exports = Process
