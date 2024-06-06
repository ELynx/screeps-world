'use strict'

const bootstrap = require('./bootstrap')

// STRATEGY give unaccessed memory node N ticks before deletion

const RoomNodeMaxAge = 60 * CREEP_LIFE_TIME // rouglhy 3 days
const StructureNodeMaxAge = 3 * CREEP_LIFE_TIME

const cleanup = {
  once: true,

  memoryNodeNotAccessed (memoryNode, age) {
    if (memoryNode.nodeAccessed) {
      return memoryNode.nodeAccessed < (Game.time - age)
    }

    return true
  },

  cleanupMemoryValues () {
    for (const name in Memory.rooms) {
      Memory.rooms[name] = _.pick(
        Memory.rooms[name],
        [
          '_ttt',
          'abld',
          'blok',
          'cook',
          'intl',
          'mlvl',
          'mnrl',
          'nodeAccessed',
          'ownerLevel',
          'ownerUsername',
          'photo',
          'slvl',
          'threat',
          'ulvl',
          'wlvl',
          'wwww'
        ]
      )
    }

    for (const name in Memory.flags) {
      Memory.flags[name] = _.pick(
        Memory.flags[name],
        [
          'aftr',
          'arum',
          'fcnt',
          'hrum'
        ]
      )
    }

    if (Memory.structures) {
      for (const id in Memory.structures) {
        Memory.structures[id] = _.pick(
          Memory.structures[id],
          [
            'input',
            'isSource',
            'mark',
            'nodeAccessed',
            'resourceType'
          ]
        )
      }
    }

    console.log('Memory values sanitized')
  },

  cleanupMemory () {
    for (const name in Memory.creeps) {
      if (!Game.creeps[name]) {
        delete Memory.creeps[name]
      }
    }

    // save some CPU on very rare stuff
    if (Game.time % RoomNodeMaxAge === 0) {
      for (const name in Memory.rooms) {
        if (!Game.rooms[name]) {
          if (this.memoryNodeNotAccessed(Memory.rooms[name], RoomNodeMaxAge)) {
            delete Memory.rooms[name]
          }
        }
      }
    }

    for (const name in Memory.flags) {
      if (!Game.flags[name]) {
        delete Memory.flags[name]
      }
    }

    if (Game.time % StructureNodeMaxAge === 0) {
      if (Memory.structures) {
        for (const id in Memory.structures) {
          if (!Game.structures[id]) {
            if (this.memoryNodeNotAccessed(Memory.structures[id], StructureNodeMaxAge)) {
              delete Memory.structures[id]
            }
          }
        }
      }
    }
  },

  cleanupFlags () {
    const taskIds = _.keys(bootstrap.taskControllers)
    const processIds = _.keys(bootstrap.processControllers)
    const flagKeys = _.map(taskIds.concat(processIds), id => id + '_')

    for (const flagName in Game.flags) {
      if (flagName === 'autobuild') continue
      if (flagName === 'photo') continue
      if (flagName === 'profiler') continue
      if (flagName === 'recount') continue
      if (flagName === 'war') continue
      if (_.startsWith(flagName, 'block')) continue

      const controllerFound = _.some(
        flagKeys,
        id => flagName.startsWith(id)
      )

      if (controllerFound) continue

      const flag = Game.flags[flagName]
      console.log('Removing undefined flag [' + flagName + '] at ' + flag.pos)
      flag.remove()
    }
  },

  cleanup () {
    if (this.once) {
      this.once = false

      this.cleanupMemoryValues()
      this.cleanupFlags()
    }

    this.cleanupMemory()

    // don't clean up so often
    if (Game.time % 100 === 0) {
      this.cleanupFlags()
    }
  }
}

module.exports = cleanup
