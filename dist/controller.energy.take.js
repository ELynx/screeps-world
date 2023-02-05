'use strict'

const Controller = require('./controller.template')

const energyTakeController = new Controller('energy.take')

energyTakeController.actRange = 1

energyTakeController.allied = true

energyTakeController.wantToKeep = function (structure) {
  const room = structure.room

  // actual, otherwise grab

  if (structure.structureType === STRUCTURE_TERMINAL) {
    return room.memory.trme || 0
  }

  if (structure.structureType === STRUCTURE_STORAGE) {
    return room.memory.stre || 0
  }

  return 0
}

energyTakeController.act = function (structure, creep) {
  const canGive = structure.store.getUsedCapacity(RESOURCE_ENERGY)
  const wantKeep = this.wantToKeep(structure)
  const wantGive = canGive - wantKeep
  const canTake = creep.store.getFreeCapacity(RESOURCE_ENERGY)

  const howMuch = Math.min(wantGive, canTake)

  if (howMuch < 0) {
    return ERR_NOT_ENOUGH_RESOURCES
  }

  return this.wrapIntent(creep, 'withdraw', structure, RESOURCE_ENERGY, howMuch)
}

energyTakeController.validateTarget = function (target, creep) {
  // STRATEGY max distance to link, those are placed for a reason
  if (target.structureType === STRUCTURE_LINK && creep.pos.getRangeTo(target) > 10) {
    return false
  }

  const has = target.store[RESOURCE_ENERGY]
  const toKeep = this.wantToKeep(target)

  let othersWant = 0
  const others = this._allAssignedTo(target)
  for (let i = 0; i < others.length; ++i) {
    const other = others[i]
    othersWant += other.store.getFreeCapacity(RESOURCE_ENERGY)
  }

  // can fit one more draw
  return has - toKeep - othersWant > 0
}

energyTakeController.targets = function (room) {
  if (room.ally && room.controller.safeMode) {
    return []
  }

  const allStructures = room.find(FIND_STRUCTURES)

  let ramparts = []
  if (room.ally) {
    ramparts = _.filter(
      allStructures,
      function (structure) {
        return structure.structureType === STRUCTURE_RAMPART && !structure.isPublic
      }
    )
  }

  const isTakeable = _.bind(
    function (structure) {
      // type is checked externally
      const toKeep = this.wantToKeep(structure)
      if (structure.store[RESOURCE_ENERGY] <= toKeep) {
        return false
      }

      if (ramparts.length > 0) {
        return !_.some(
          ramparts,
          function (ramp) {
            return ramp.pos.x === structure.pos.x && ramp.pos.y === structure.pos.y
          }
        )
      }

      return true
    },
    this
  )

  const takeable = _.filter(
    allStructures,
    function (structure) {
      // small checks are inside because they are executed on a lot of items
      if (structure.structureType === STRUCTURE_CONTAINER ||
                structure.structureType === STRUCTURE_STORAGE ||
                // STRATEGY allow to take from terminal, maybe airdrop energy
                structure.structureType === STRUCTURE_TERMINAL) {
        return isTakeable(structure)
      } else if (structure.structureType === STRUCTURE_LINK) {
        // STRATEGY do not steal from source link
        return structure.isSource() ? false : isTakeable(structure)
      }

      return false
    }
  )

  return takeable
}

energyTakeController.filterCreep = function (creep) {
  // not restocker
  if (creep.memory.rstk === true) {
    return false
  }

  return this._isHarvestAble(creep)
}

energyTakeController.register()

module.exports = energyTakeController
