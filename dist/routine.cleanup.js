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
}

function cleanupFlags () {
  const taskIds = Object.keys(this.taskControllers)
  const processIds = Object.keys(this.processControllers)
  const flagKeys = _.map(taskIds.concat(processIds), id => id + '_')

  for (const flagName in Game.flags) {
    if (flagName === 'profiler') continue
    if (flagName === 'recount') continue
    if (flagName === 'autobuild') continue

    if (flagName.startsWith('help_')) continue

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
}

module.exports = {
  cleanup {
    cleanup: function () {
      cleanupMemory()
      cleanupFlags()
    }
  }
}
