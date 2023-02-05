'use strict'

const bootstrap = require('./bootstrap')

const cleanup = {
  memoryNodeNotAccessed: function (memoryNode) {
    if (memoryNode.nodeAccessed) {
      // STRATEGY give unaccessed memory node N ticks before deletion
      return memoryNode.nodeAccessed < (Game.time - 5)
    }

    return true
  },

  cleanupMemory: function () {
    for (const name in Memory.creeps) {
      if (!Game.creeps[name]) {
        if (this.memoryNodeNotAccessed(Memory.creeps[name])) {
          delete Memory.creeps[name]
        }
      }
    }

    for (const name in Memory.rooms) {
      if (!Game.rooms[name]) {
        if (this.memoryNodeNotAccessed(Memory.rooms[name])) {
          delete Memory.rooms[name]
        }
      }
    }

    for (const name in Memory.flags) {
      if (!Game.flags[name]) {
        if (this.memoryNodeNotAccessed(Memory.flags[name])) {
          delete Memory.flags[name]
        }
      }
    }

    if (Memory.structures) {
      for (const id in Memory.structures) {
        if (!Game.structures[id]) {
          if (this.memoryNodeNotAccessed(Memory.structures[id])) {
            delete Memory.structures[id]
          }
        }
      }
    }

    if (Memory.reputation) {
      if (Object.keys(Memory.reputation).length === 0) {
        delete Memory.reputation
      }
    }
  },

  cleanupFlags: function () {
    const taskIds = Object.keys(bootstrap.taskControllers)
    const processIds = Object.keys(bootstrap.processControllers)
    const flagKeys = _.map(taskIds.concat(processIds), id => id + '_')

    for (const flagName in Game.flags) {
      if (flagName === 'profiler') continue
      if (flagName === 'recount') continue
      if (flagName === 'autobuild') continue

      if (flagName.startsWith('aggro_')) continue

      const processFound = _.some(
        flagKeys,
        function (id) {
          return flagName.startsWith(id)
        }
      )

      if (!processFound) {
        const flag = Game.flags[flagName]
        console.log('Removing undefined flag [' + flagName + '] at ' + flag.pos)
        flag.remove()
      }
    }
  },

  cleanup: function () {
    this.cleanupMemory()
    this.cleanupFlags()
  }
}

module.exports = cleanup
