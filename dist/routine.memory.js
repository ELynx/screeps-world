/* eslint curly: "error" */
'use strict'

function cleanupMemory () {
  for (const name in Memory.creeps) {
    if (!Game.creeps[name]) {
      delete Memory.creeps[name]
    }
  }

  for (const name in Memory.rooms) {
    if (!Game.rooms[name]) {
      delete Memory.rooms[name]
    }
  }

  for (const name in Memory.flags) {
    if (!Game.flags[name]) {
      delete Memory.flags[name]
    }
  }

  if (Memory.structures) {
    for (const id in Memory.structures) {
      if (!Game.structures[id]) {
        delete Memory.structures[id]
      }
    }
  }

  if (Memory.profiler) {
    if (!Game.profiler) {
      delete Memory.profiler
    }
  }
};

module.exports = cleanupMemory
