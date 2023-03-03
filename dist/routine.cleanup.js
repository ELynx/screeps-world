'use strict'

const bootstrap = require('./bootstrap')

// STRATEGY give unaccessed memory node N ticks before deletion

const RoomNodeMaxAge = 60 * CREEP_LIFE_TIME // rouglhy 3 days
const StructureNodeMaxAge = 3 * CREEP_LIFE_TIME

const cleanup = {
  memoryNodeNotAccessed: function (memoryNode, age) {
    if (memoryNode.nodeAccessed) {
      return memoryNode.nodeAccessed < (Game.time - age)
    }

    return true
  },

  cleanupMemory: function () {
    for (const name in Memory.creeps) {
      if (!Game.creeps[name]) {
        delete Memory.creeps[name]
      }
    }

    for (const name in Memory.rooms) {
      if (!Game.rooms[name]) {
        if (this.memoryNodeNotAccessed(Memory.rooms[name], RoomNodeMaxAge)) {
          delete Memory.rooms[name]
        }
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
          if (this.memoryNodeNotAccessed(Memory.structures[id], StructureNodeMaxAge)) {
            delete Memory.structures[id]
          }
        }
      }
    }
  },

  cleanupFlags: function () {
    const taskIds = _.keys(bootstrap.taskControllers)
    const processIds = _.keys(bootstrap.processControllers)
    const flagKeys = _.map(taskIds.concat(processIds), id => id + '_')

    for (const flagName in Game.flags) {
      if (flagName === 'profiler') continue
      if (flagName === 'recount') continue
      if (flagName === 'autobuild') continue
      if (flagName === 'dashboard') continue

      const controllerFound = _.some(
        flagKeys,
        function (id) {
          return flagName.startsWith(id)
        }
      )

      if (controllerFound) continue

      const flag = Game.flags[flagName]
      console.log('Removing undefined flag [' + flagName + '] at ' + flag.pos)
      flag.remove()
    }
  },

  cleanup: function () {
    this.cleanupMemory()
    this.cleanupFlags()
  }
}

module.exports = cleanup
