'use strict'

const bootstrap = require('./bootstrap')

const Controller = require('./controller.template')

const energySpecialistController = new Controller('energy.specialist')

const WaitNearEmptySource = 10

const unspecialistId = 'energy.unspecialist'

energySpecialistController.actRange = 1

energySpecialistController.unowned = true
energySpecialistController.sourceKeeper = energySpecialistController.unowned

energySpecialistController.ignoreCreepsForTargeting = false

energySpecialistController.restockTargets = function (room) {
  const unspecialist = bootstrap.roomControllers[unspecialistId]

  if (unspecialist === undefined) {
    this.debugLine(room, 'Missing unspecialist')
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
  if (harvestRc === bootstrap.WANR_BOTH_EXHAUSED ||
      harvestRc === bootstrap.WARN_INTENDEE_EXHAUSTED ||
      harvestRc === bootstrap.ERR_INTENDEE_EXHAUSTED) {
    const restockTargets = this.restockTargets(creep.room)
    for (let i = 0; i < restockTargets.length; ++i) {
      const restockTarget = restockTargets[i]

      if (creep.pos.isNearTo(restockTarget)) {
        const restockRc = this.restock(restockTarget, creep)

        // on error, such as intended exhausted, check other target
        if (restockRc < 0) continue

        // restock was OK or warning

        if (harvestRc !== bootstrap.WANR_BOTH_EXHAUSED) {
          // source will have more energy, and some of current will be offloaded
          return OK
        }

        break // from target loop
      }
    }
  }

  // amortize source exhaustion
  if (harvestRc === bootstrap.WANR_BOTH_EXHAUSED ||
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
  for (let i = 0; i < others.length; ++i) {
    const other = others[i]
    if (other.memory.rstk) {
      otherRestockersWork += _.countBy(other.body, 'type')[WORK] || 0
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
  return creep.memory.rstk === true && this._isHarvestAble(creep)
}

energySpecialistController.register()

module.exports = energySpecialistController
