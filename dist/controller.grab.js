'use strict'

const bootstrap = require('./bootstrap')

const intentSolver = require('./routine.intent')

const cook = require('./cook')

const Controller = require('./controller.template')

const grabController = new Controller('grab')

grabController.actRange = 1

grabController.roomPrepare = function (room) {
  this._roomPrepare(room)

  // cache of room coordinates where creeps can maybe reach something
  this.fastCheck = false
  this.fastCheckX = new Map()
  this.fastCheckY = new Map()
}

grabController.act = function (room, creep) {
  const energyOnlyCreep = this._isStationarySpecialist(creep)

  const grabs = this._findTargets(room)

  let didWithdraw = false
  let didPickup = false

  for (const grab of grabs) {
    const from = grab[grab.type]

    if (!creep.pos.isNearTo(from)) continue

    if ((didWithdraw === false) && (grab.type === LOOK_TOMBSTONES || grab.type === LOOK_RUINS)) {
      for (const resourceType of _.keys(from.store)) {
        if (energyOnlyCreep && resourceType !== RESOURCE_ENERGY) continue // to next type
        if (!cook.roomCanHandle(room, resourceType)) continue // to next type

        if (intentSolver.getUsedCapacity(from, resourceType) > 0) {
          const rc = this.wrapIntent(creep, 'withdraw', from, resourceType)
          if (rc >= OK) {
            didWithdraw = true
            break // from types loop
          }
        }
      }
    }

    if (didPickup === false && grab.type === LOOK_RESOURCES) {
      if (!energyOnlyCreep || from.resourceType === RESOURCE_ENERGY) {
        if (cook.roomCanHandle(room, from.resouceType)) {
          if (intentSolver.getAmount(from) > 0) {
            const rc = this.wrapIntent(creep, 'pickup', from)
            if (rc >= OK) {
              didPickup = true
            }
          }
        }
      }
    }

    if (didWithdraw && didPickup) break // from grabs loop
  }

  // STRATEGY withdraw is reported as warning, because it is widely used
  if (didWithdraw) return bootstrap.WARN_INTENDEE_EXHAUSTED
  // STRATEGY pickup is OK since it is not widely used
  if (didPickup) return OK

  return ERR_NOT_FOUND
}

grabController.targets = function (room) {
  this.fastCheck = true

  const result = []

  const tombstones = room.find(FIND_TOMBSTONES)
  for (const tombstone of tombstones) {
    for (const resouceType of _.keys(tombstone.store)) {
      if (cook.roomCanHandle(room, resouceType)) {
        result.push(
          {
            type: LOOK_TOMBSTONES,
            [LOOK_TOMBSTONES]: tombstone
          }
        )

        this.fastCheckX.set((tombstone.pos.x - 1), true)
        this.fastCheckX.set((tombstone.pos.x), true)
        this.fastCheckX.set((tombstone.pos.x + 1), true)

        this.fastCheckY.set((tombstone.pos.y - 1), true)
        this.fastCheckY.set((tombstone.pos.y), true)
        this.fastCheckY.set((tombstone.pos.y + 1), true)
      }
    }
  }

  const ruins = room.find(FIND_RUINS)
  for (const ruin of ruins) {
    for (const resouceType of _.keys(ruin.store)) {
      if (cook.roomCanHandle(room, resouceType)) {
        result.push(
          {
            type: LOOK_RUINS,
            [LOOK_RUINS]: ruin
          }
        )

        this.fastCheckX.set((ruin.pos.x - 1), true)
        this.fastCheckX.set((ruin.pos.x), true)
        this.fastCheckX.set((ruin.pos.x + 1), true)

        this.fastCheckY.set((ruin.pos.y - 1), true)
        this.fastCheckY.set((ruin.pos.y), true)
        this.fastCheckY.set((ruin.pos.y + 1), true)
      }
    }
  }

  const resources = room.find(FIND_DROPPED_RESOURCES)
  for (const resource of resources) {
    if (cook.roomCanHandle(room, resource.resouceType)) {
      result.push(
        {
          type: LOOK_RESOURCES,
          [LOOK_RESOURCES]: resource
        }
      )

      this.fastCheckX.set((resource.pos.x - 1), true)
      this.fastCheckX.set((resource.pos.x), true)
      this.fastCheckX.set((resource.pos.x + 1), true)

      this.fastCheckY.set((resource.pos.y - 1), true)
      this.fastCheckY.set((resource.pos.y), true)
      this.fastCheckY.set((resource.pos.y + 1), true)
    }
  }

  return result
}

grabController.filterCreep = function (creep) {
  // only if some creep passed the check and triggered target search
  if (this.fastCheck) {
    if (!this.fastCheckX.has(creep.pos.x)) {
      return false
    }

    if (!this.fastCheckY.has(creep.pos.y)) {
      return false
    }
  }

  return this._hasFreeCapacity(creep)
}

grabController.register()

module.exports = grabController
