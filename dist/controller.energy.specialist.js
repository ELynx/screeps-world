'use strict'

const bootstrap = require('./bootstrap')

const Controller = require('./controller.template')

const energySpecialistController = new Controller('energy.specialist')

const WaitNearEmptySource = 10

const unspecialistId = 'energy.unspecialist'

energySpecialistController.actRange = 1

energySpecialistController.restockTargets = function (room) {
  const unspecialist = bootstrap.roomControllers[unspecialistId]

  if (unspecialist === undefined) {
    console.log('Missing unspecialist')
    return []
  }

  return unspecialist._findTargets(room)
}

energySpecialistController.restock = function (target, creep) {
  const unspecialist = bootstrap.roomControllers[unspecialistId]

  if (unspecialist === undefined) {
    return bootstrap.ERR_INVALID_INTENT_NAME
  }

  return unspecialist.act(target, creep)
}

energySpecialistController.act = function (source, creep) {
  const harvestRc = this.wrapIntent(creep, 'harvest', source)

  // if all is OK then return OK
  if (harvestRc === OK) {
    return harvestRc
  }

  // if this will be a last dig for capacity, search for drop site nearby
  if (harvestRc === bootstrap.WARN_BOTH_EXHAUSED ||
      harvestRc === bootstrap.WARN_INTENDEE_EXHAUSTED ||
      harvestRc === bootstrap.ERR_INTENDEE_EXHAUSTED) {
    const restockTargets = this.restockTargets(creep.room)

    // check if any of targets are in bad shape when harvesting in remote room
    if (creep.room._actType_ === bootstrap.RoomActTypeRemoteHarvest) {
      const hasLowHits = _.some(
        restockTargets,
        function (restockTarget) {
          return restockTarget.hits < 0.5 * restockTarget.hitsMax
        }
      )

      // quit the loop and give repair controller a chance
      if (hasLowHits) return harvestRc
    }

    for (const restockTarget of restockTargets) {
      if (creep.pos.isNearTo(restockTarget)) {
        if (restockTarget.structureType === STRUCTURE_CONTAINER) {
          if (creep.pos.x !== restockTarget.pos.x || creep.pos.y !== restockTarget.pos.y) {
            const direction = creep.pos.getDirectionTo(restockTarget)
            creep.moveWrapper(direction)
          }
        }

        const restockRc = this.restock(restockTarget, creep)

        // on error, such as intended exhausted, check other target
        if (restockRc < 0) continue

        // restock was OK or warning

        if (harvestRc !== bootstrap.WARN_BOTH_EXHAUSED) {
          // source will have more energy, and some of current will be offloaded
          return OK
        }

        break // from target loop
      }
    }
  }

  // amortize source exhaustion
  if (harvestRc === bootstrap.WARN_BOTH_EXHAUSED ||
      harvestRc === bootstrap.WARN_INTENDED_EXHAUSTED ||
      harvestRc === bootstrap.ERR_INTENDED_EXHAUSTED ||
      harvestRc === ERR_NOT_ENOUGH_RESOURCES) {
    if (source.ticksToRegeneration && source.ticksToRegeneration <= WaitNearEmptySource) {
      return OK
    }
  }

  // whatever error transpired, continue
  return harvestRc
}

energySpecialistController.validateTarget = function (allTargets, target, creep) {
  // if there is no one in the room, no collision
  if (target.room === undefined) {
    return true
  }

  let otherRestockersWork = 0

  const others = this._allAssignedTo(target)
  for (const other of others) {
    if (this._isRestocker(other)) {
      bootstrap.activeBodyParts(other)
      otherRestockersWork += other._work_
    }
  }

  // no collision
  if (otherRestockersWork === 0) {
    return true
  }

  const workNeeded = target.room.sourceEnergyCapacity() / ENERGY_REGEN_TIME / HARVEST_POWER

  return workNeeded > otherRestockersWork
}

energySpecialistController.targets = function (room) {
  const allSources = room.find(FIND_SOURCES)
  return _.filter(allSources, source => source.energy > 0)
}

energySpecialistController.filterCreep = function (creep) {
  return this._isRestocker(creep) && this._isHarvestAble(creep)
}

energySpecialistController.register()

module.exports = energySpecialistController
