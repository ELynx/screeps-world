'use strict'

function makeDebuggable (target, archetype) {
  target.archetype = archetype

  /**
    Write a common debug line, and move caret to next line.
    @param {Room} room to overlay with text.
    @param {string} what.
    **/
  target.debugLine = function (room, what) {
    if (Game.flags.verbose) {
      room.roomDebug(what)
    }
  }

  /**
    Write greeting.
    @param {Room} room to overlay with text.
    **/
  target.debugHeader = function (room) {
    this.debugLine(room, '[' + this.archetype + ' ' + this.id + ']')
  }
};

module.exports = makeDebuggable
