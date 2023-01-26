'use strict'

const globals = require('globals')
const makeDebuggable = require('routine.debuggable')

const profiler = require('screeps-profiler')

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
    globals.registerProcessController(this)

    profiler.registerObject(this, this.id)
  }

  this.register = function () {
    this._register()
  }
};

module.exports = Process
