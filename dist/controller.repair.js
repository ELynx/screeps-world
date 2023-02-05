'use strict'

const Controller = require('./controller.template')

const repairController = new Controller('repair')

const TargetRoadHpMultiplier = [
  0.0,
  0.16,
  0.33
]

const TargetStructureHpMultiplier = [
  0.75, // repair buildings in rooms that are just attached
  0.8,
  0.85,
  0.9
]

/**
Get value from array with index capped at length.
**/
const fromArray = function (from, index) {
  return from[index >= from.length ? from.length - 1 : index]
}

repairController.actRange = 3

repairController.oddOrEven = 1

repairController.ally = true
repairController.neutral = repairController.ally
repairController.unowned = repairController.ally

repairController.extra = function (structure) {
  return structure.__targetHp
}

repairController.roomPrepare = function (room) {
  this._prepareExcludedTargets(room)
}

repairController.observeMyCreep = function (creep) {
  this._excludeTarget(creep)
}

repairController.act = function (target, creep) {
  let onSpotMultiplier = 1.0
  if (creep.room.memory && creep.room.memory.threat) {
    onSpotMultiplier = 1.5
  }

  return this.wrapIntent(creep, 'repair', target, creep.memory.xtra * onSpotMultiplier)
}

repairController.targets = function (room) {
  const barrHp = room.memory.wlvl * 1000

  // STRATEGY don't run with every booboo
  const roadMult = fromArray(TargetRoadHpMultiplier, room.memory.elvl)
  const otherMult = fromArray(TargetStructureHpMultiplier, room.memory.elvl)

  // STRATEGY some histeresis: 4500 is creep life of 1500 ticks of decay (300 decay every 100 ticks)
  const rampHp = Math.min(Math.ceil(1.2 * barrHp), barrHp + 4500)

  return room.find(
    FIND_STRUCTURES,
    {
      filter: function (structure) {
        if (!structure.hits || structure.hits >= structure.hitsMax) return false

        if (!structure.isActiveSimple()) return false

        if (structure.structureType === STRUCTURE_WALL) {
          if (structure.hits < barrHp) {
            structure.__targetHp = barrHp
            return true
          }
        } else if (structure.structureType === STRUCTURE_RAMPART) {
          // notice, barrHp check, rampHp set
          if (structure.hits < barrHp) {
            structure.__targetHp = rampHp
            return true
          }
        } else if (structure.structureType === STRUCTURE_ROAD) {
          const hp = Math.ceil(structure.hitsMax * roadMult)
          if (structure.hits < hp) {
            structure.__targetHp = hp
            return true
          }
        } else {
          const hp = Math.ceil(structure.hitsMax * otherMult)
          if (structure.hits < hp) {
            // STRATEGY some histeresis, repair to top
            structure.__targetHp = structure.hitsMax
            return true
          }
        }

        return false
      }
    }
  )
}

repairController.register()

module.exports = repairController
