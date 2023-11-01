'use strict'

const bootstrap = require('./bootstrap')

const Controller = require('./controller.template')

const repairController = new Controller('repair')

// STRATEGY hits to initiate repair

const TargetRoadHpMultiplier = [
  0.0,
  0.16,
  0.33,
  0.5,
  0.66,
  0.75,
  0.8,
  0.85,
  0.9
]

const TargetStructureHpMultiplier = [
  0.75,
  0.8,
  0.85,
  0.9
]

const fromArray = function (from, index) {
  return from[Math.min(index, from.length - 1)]
}

repairController.actRange = 3

repairController.extra = function (structure) {
  return structure.__repairController_targetHp
}

repairController.roomPrepare = function (room) {
  this._roomPrepare(room)
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

  return this.wrapIntent(creep, 'repair', target, Math.round(creep.memory.xtra * onSpotMultiplier))
}

repairController.validateTarget = function (allTargets, target, creep) {
  // not a restocker, no special rules
  if (!this._isRestocker(creep)) return true

  // care only for single cluster
  if (Math.abs(target.pos.x - creep.pos.x) > this.actRange) return false
  if (Math.abs(target.pos.y - creep.pos.y) > this.actRange) return false

  return true
}

repairController.targets = function (room) {
  const barrHp = room.memory.wlvl * 1000
  // STRATEGY some histeresis: 4500 is creep life of 1500 ticks of decay (300 decay every 100 ticks)
  const rampHp = Math.min(Math.ceil(1.2 * barrHp), barrHp + 4500)

  // STRATEGY in not controlled rooms do only minimal upkeep
  const roadMult = fromArray(TargetRoadHpMultiplier, room.level())
  const otherMult = fromArray(TargetStructureHpMultiplier, room._my_ ? room.level() : 1)

  const repairable = _.keys(CONSTRUCTION_COST)

  const structuresWithHits = room.find(
    FIND_STRUCTURES,
    {
      filter: function (structure) {
        return structure.hits &&
               structure.hitsMax &&
               structure.isActiveSimple &&
               structure.hits < structure.hitsMax &&
               _.some(repairable, _.matches(structure.structureType))
      }
    }
  )

  return _.filter(
    structuresWithHits,
    function (structure) {
      if (structure.structureType === STRUCTURE_WALL) {
        if (structure.hits < barrHp) {
          structure.__repairController_targetHp = barrHp
          return true
        }
      } else if (structure.structureType === STRUCTURE_RAMPART) {
        // notice, barrHp check, rampHp set
        if (structure.hits < barrHp) {
          structure.__repairController_targetHp = rampHp
          return true
        }
      } else if (structure.structureType === STRUCTURE_ROAD) {
        const targetHp = Math.ceil(structure.hitsMax * roadMult)
        if (structure.hits < targetHp) {
          structure.__repairController_targetHp = targetHp
          return true
        }
      } else {
        const targetHp = Math.ceil(structure.hitsMax * otherMult)
        if (structure.hits < targetHp) {
          if (structure.structureType === STRUCTURE_CONTAINER) {
            if (room._actType_ === bootstrap.RoomActTypeRemoteHarvest) {
              if (!structure.isSource()) return false
            }
          }

          // STRATEGY some histeresis, repair to top
          structure.__repairController_targetHp = structure.hitsMax
          return true
        }
      }

      return false
    }
  )
}

repairController.register()

module.exports = repairController
