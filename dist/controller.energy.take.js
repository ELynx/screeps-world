'use strict'

const intentSolver = require('./routine.intent')

const Controller = require('./controller.template')

const energyTakeController = new Controller('energy.take')

energyTakeController.actRange = 1

energyTakeController.act = function (structure, creep) {
  const wantGive = structure.supply.amount(RESOURCE_ENERGY)
  const canTake = intentSolver.getFreeCapacity(creep, RESOURCE_ENERGY)

  const howMuch = Math.min(wantGive, canTake)

  if (howMuch <= 0) {
    return ERR_NOT_ENOUGH_RESOURCES
  }

  return this.wrapIntent(creep, 'withdraw', structure, RESOURCE_ENERGY, howMuch)
}

energyTakeController.validateTarget = function (allTargets, target, creep) {
  // prevent upgrades from going on adventures
  if (target.room.controller && this._isUpgrader(creep)) {
    if (!this._isTargetWithinRange(target, target.room.controller, 3)) return false
  }

  const wantGive = target.supply.amount(RESOURCE_ENERGY)

  let othersWant = 0
  const others = this._allAssignedTo(target)
  for (const other of others) {
    othersWant += intentSolver.getFreeCapacity(other, RESOURCE_ENERGY)
  }

  // can fit one more draw
  return wantGive > othersWant
}

energyTakeController.targets = function (room) {
  if (!room._my_ && room.controller && room.controller.safeMode) {
    return []
  }

  let withEnergySupply = room.withSupply(RESOURCE_ENERGY)

  if (withEnergySupply.length === 0) return []

  if (!room._my_) {
    const allStructures = room.find(FIND_STRUCTURES)

    const ramparts = _.filter(
      allStructures,
      structure => {
        return structure.structureType === STRUCTURE_RAMPART && !structure.isPublic
      }
    )

    if (ramparts.length > 0) {
      const isTakeable = function (structure) {
        return !_.some(
          ramparts,
          rampart => {
            return rampart.pos.x === structure.pos.x && rampart.pos.y === structure.pos.y
          }
        )
      }

      withEnergySupply = _.filter(withEnergySupply, isTakeable)
    }
  }

  // TODO sort does not work since there is a sort inside assign op
  /*
  withEnergySupply.sort(
    (t1, t2) => {
      const priority1 = t1.supply.priority
      const priority2 = t2.supply.priority

      return priority1 - priority2
    }
  )
  */

  return withEnergySupply
}

energyTakeController.filterCreep = function (creep) {
  // STRATEGY take with empty only, reduce runs to containers
  return this._isNotHarvester(creep) && this._hasCM(creep) && this._isEmpty(creep)
}

energyTakeController.creepToTargetCost = function (creep, target) {
  // STRATEGY give links slight disadvantage compared to other places
  // a. trigger more picks from containers
  // b. hack to trigger 'sus' assignment logic for containers early and reuse path
  return this._manhattanDistanceCost(creep, target) + (target.structureType === STRUCTURE_LINK ? 2 : 0)
}

energyTakeController.register()

module.exports = energyTakeController
