'use strict'

const bootstrap = require('./bootstrap')

const Controller = require('./controller.template')

const repairController = new Controller('repair')

// STRATEGY hits to initiate repair
// STRATEGY in not controlled rooms do only minimal upkeep

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

const Repairable = new Set(_.keys(CONSTRUCTION_COST))

const RoadMaxHp1 = ROAD_HITS
const RoadMaxHp2 = ROAD_HITS * CONSTRUCTION_COST_ROAD_SWAMP_RATIO
const RoadMaxHp3 = ROAD_HITS * CONSTRUCTION_COST_ROAD_WALL_RATIO

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

  const roadMult = fromArray(TargetRoadHpMultiplier, room.level())
  const roadTargetHp1 = Math.ceil(RoadMaxHp1 * roadMult)
  const roadTargetHp2 = Math.ceil(RoadMaxHp2 * roadMult)
  const roadTargetHp3 = Math.ceil(RoadMaxHp3 * roadMult)

  const structuresWithHits = room.find(
    FIND_STRUCTURES,
    {
      filter: structure => {
        return structure.hits &&
               structure.hitsMax &&
               structure.isActiveSimple &&
               structure.hits < structure.hitsMax
      }
    }
  )

  // no assignment of extra means fix until creep has energy

  return _.filter(
    structuresWithHits,
    function (structure) {
      const structureType = structure.structureType
      if (!Repairable.has(structureType)) return false

      const hits = structure.hits
      const hitsMax = structure.hitsMax

      if (structureType === STRUCTURE_WALL) {
        if (hits < wallTargetHp) {
          structure.__repairController_targetHp = wallTargetHp
          return true
        }
        return false
      } else if (structureType === STRUCTURE_RAMPART) {
        return hits < wallTargetHp
      } else if (structureType === STRUCTURE_ROAD && hitsMax === RoadMaxHp1) {
        structure.__repairController_targetHp = roadTargetHp1
        return hits < roadTargetHp1
      } else if (structureType === STRUCTURE_ROAD && hitsMax === RoadMaxHp2) {
        structure.__repairController_targetHp = roadTargetHp2
        return hits < roadTargetHp2
      } else if (structureType === STRUCTURE_ROAD && hitsMax === RoadMaxHp3) {
        structure.__repairController_targetHp = roadTargetHp3
        return hits < roadTargetHp3
      } else if (structureType === STRUCTURE_CONTAINER) {
        // remote containers have special rules
        if (room._actType_ === bootstrap.RoomActTypeRemoteHarvest) {
          // ignore random containers
          if (!structure.isSource()) return false
        }
      }

      return true
    }
  )
}

repairController.register()

module.exports = repairController
