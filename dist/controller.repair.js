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
  // fill rampart completely, reduce walking
  const targetHp = target.structureType === STRUCTURE_RAMPART ? undefined : creep.memory.xtra
  return this.wrapIntent(creep, 'repair', target, targetHp)
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
        let targetHp = Math.ceil(structure.hitsMax * otherMult)

        // remote containers have special rules
        if (structure.structureType === STRUCTURE_CONTAINER &&
            room._actType_ === bootstrap.RoomActTypeRemoteHarvest) {
          // ignore random containers
          if (!structure.isSource()) return false

          // mark for fixing with any damage
          targetHp = structure.hitsMax
        }

        if (structure.hits < targetHp) {
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
