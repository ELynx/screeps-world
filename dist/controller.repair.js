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
  return this.wrapIntent(creep, 'repair', target, creep.memory.xtra)
}

repairController.targets = function (room) {
  const wallTargetHp = room.memory.wlvl * 1000

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
        if (structure.hits < wallTargetHp) {
          structure.__repairController_targetHp = wallTargetHp
          return true
        }
      } else if (structure.structureType === STRUCTURE_RAMPART) {
        if (structure.hits < wallTargetHp) {
          return true
        }
      } else if (structure.structureType === STRUCTURE_ROAD) {
        const targetHits = Math.ceil(structure.hitsMax * roadMult)
        if (structure.hits < targetHits) {
          structure.__repairController_targetHp = targetHits
          return true
        }
      } else if (structure.structureType === STRUCTURE_CONTAINER) {
        // remote containers have special rules
        if (room._actType_ === bootstrap.RoomActTypeRemoteHarvest) {
          // ignore random containers
          if (!structure.isSource()) return false
        }
        return true
      }

      return structure.hits < structure.hitsMax * otherMult
    }
  )
}

repairController.register()

module.exports = repairController
