'use strict'

const profiler = require('screeps-profiler')

const bootstrap = require('bootstrap')

const makeDebuggable = require('routine.debuggable')

function Process (id) {
  /**
    Unique identifier.
    **/
  this.id = id

  // attach methods that allow fast debug writing
  makeDebuggable(this, 'Process')

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
