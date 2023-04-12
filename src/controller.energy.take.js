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
  if (!room.my && room.controller && room.controller.safeMode) {
    return []
  }

  const allStructures = room.find(FIND_STRUCTURES)
  let withEnergySupply = _.filter(
    allStructures,
    function (structure) {
      return structure.supply.priority !== null && structure.supply.amount(RESOURCE_ENERGY) > 0
    }
  )

  if (withEnergySupply.length === 0) return []

  if (!room.my) {
    const ramparts = _.filter(
      allStructures,
      function (structure) {
        return structure.structureType === STRUCTURE_RAMPART && !structure.isPublic
      }
    )

    if (ramparts.length > 0) {
      const isTakeable = function (structure) {
        return !_.some(
          ramparts,
          function (ramp) {
            return ramp.pos.x === structure.pos.x && ramp.pos.y === structure.pos.y
          }
        )
      }

      withEnergySupply = _.filter(withEnergySupply, isTakeable)
    }
  }

  withEnergySupply.sort(
    function (t1, t2) {
      const priority1 = t1.supply.priority
      const priority2 = t2.supply.priority

      return priority1 - priority2
    }
  )

  return withEnergySupply
}

energyTakeController.filterCreep = function (creep) {
  // STRATEGY take with empty only, reduce runs to containers
  return this._isNotRestocker(creep) && this._hasCM(creep) && this._isEmpty(creep)
}

energyTakeController.register()

module.exports = energyTakeController
