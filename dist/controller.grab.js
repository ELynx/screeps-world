'use strict'

const intentSolver = require('./routine.intent')

const Controller = require('./controller.template')

const grabController = new Controller('grab')

grabController.actRange = 1

grabController.roomPrepare = function (room) {
  this._roomPrepare(room)

  // cache of room coordinates where creeps can maybe reach something
  this.fastCheck = false
  this.fastCheckX = { }
  this.fastCheckY = { }
}

grabController.act = function (room, creep) {
  const hasUniversalStore = room.storage || room.terminal

  const grabs = this._findTargets(room)

  for (const grab of grabs) {
    const from = grab[grab.type]

    if (!creep.pos.isNearTo(from)) continue

    if (grab.type === LOOK_TOMBSTONES ||
        grab.type === LOOK_RUINS) {
      const typesToGrab = hasUniversalStore ? _.keys(from.store) : [RESOURCE_ENERGY]

      for (const typeToGrab of typesToGrab) {
        if (intentSolver.getUsedCapacity(from, typeToGrab) > 0) {
          const rc = this.wrapIntent(creep, 'withdraw', from, typeToGrab)
          if (rc !== OK) return rc
        }
      }
    }

    if (grab.type === LOOK_RESOURCES) {
      if (hasUniversalStore || from.resourceType === RESOURCE_ENERGY) {
        if (intentSolver.getAmount(from) > 0) {
          const rc = this.wrapIntent(creep, 'pickup', from)
          if (rc !== OK) return rc
        }
      }
    }
  }

  return OK
}

grabController.validateTarget = undefined // not needed because nearby is implied

grabController.targets = function (room) {
  this.fastCheck = true

  const hasUniversalStore = room.storage || room.terminal

  const tombstones = room.find(FIND_TOMBSTONES)
  const ruins = room.find(FIND_RUINS)
  const resources = room.find(FIND_DROPPED_RESOURCES)

  const grabs = []

  for (const tombstone of tombstones) {
    const typesToGrab = hasUniversalStore ? _.keys(tombstone.store) : [RESOURCE_ENERGY]

    for (const typeToGrab of typesToGrab) {
      if (tombstone.store.getUsedCapacity(typeToGrab) > 0) {
        grabs.push(
          {
            type: LOOK_TOMBSTONES,
            [LOOK_TOMBSTONES]: tombstone
          }
        )

        this.fastCheckX[(tombstone.pos.x - 1)] = true
        this.fastCheckX[(tombstone.pos.x)] = true
        this.fastCheckX[(tombstone.pos.x + 1)] = true

        this.fastCheckY[(tombstone.pos.y - 1)] = true
        this.fastCheckY[(tombstone.pos.y)] = true
        this.fastCheckY[(tombstone.pos.y + 1)] = true
      }
    }
  }

  for (const ruin of ruins) {
    const typesToGrab = hasUniversalStore ? _.keys(ruin.store) : [RESOURCE_ENERGY]

    for (const typeToGrab of typesToGrab) {
      if (ruin.store.getUsedCapacity(typeToGrab) > 0) {
        grabs.push(
          {
            type: LOOK_RUINS,
            [LOOK_RUINS]: ruin
          }
        )

        this.fastCheckX[(ruin.pos.x - 1)] = true
        this.fastCheckX[(ruin.pos.x)] = true
        this.fastCheckX[(ruin.pos.x + 1)] = true

        this.fastCheckY[(ruin.pos.y - 1)] = true
        this.fastCheckY[(ruin.pos.y)] = true
        this.fastCheckY[(ruin.pos.y + 1)] = true
      }
    }
  }

  for (const resource of resources) {
    if (hasUniversalStore || resource.resourceType === RESOURCE_ENERGY) {
      if (resource.amount > 0) {
        grabs.push(
          {
            type: LOOK_RESOURCES,
            [LOOK_RESOURCES]: resource
          }
        )

        this.fastCheckX[(resource.pos.x - 1)] = true
        this.fastCheckX[(resource.pos.x)] = true
        this.fastCheckX[(resource.pos.x + 1)] = true

        this.fastCheckY[(resource.pos.y - 1)] = true
        this.fastCheckY[(resource.pos.y)] = true
        this.fastCheckY[(resource.pos.y + 1)] = true
      }
    }
  }

  return grabs
}

grabController.filterCreep = function (creep) {
  // only if some creep passed the check and triggered target search
  if (this.fastCheck) {
    if (this.fastCheckX[creep.pos.x] === undefined) {
      return false
    }

    if (this.fastCheckY[creep.pos.y] === undefined) {
      return false
    }
  }

  return this._hasFreeCapacity(creep)
}

grabController.register()

module.exports = grabController
