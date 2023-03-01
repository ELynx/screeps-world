'use strict'

const profiler = require('./screeps-profiler')

const bootstrap = require('./bootstrap')

function Process (id) {
  /**
    Unique identifier.
    **/
  this.id = id

  /**
    Work on a room.
    @param {Room} room to process.
    **/
  this.work = undefined

  this._register = function () {
    bootstrap.registerProcessController(this)
    profiler.registerObject(this, this.id)
  }

  this.register = function () {
    this._register()
  }
};

module.exports = Process
