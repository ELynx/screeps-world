'use strict'

const bootstrap = require('bootstrap')

const Controller = require('controller.template')

const mineralHarvestController = new Controller('mineral.harvest')

mineralHarvestController.actRange = 1

mineralHarvestController.act = function (extractor, creep) {
  // STRATEGY wait for full take, keep on target
  if (extractor.cooldown > 0) {
    return OK
  }

  const minerals = extractor.pos.lookFor(LOOK_MINERALS)

  // because room has only one mineral
  // eslint-disable-next-line no-unreachable-loop
  for (let i = 0; i < minerals.length; ++i) {
    const mineral = minerals[i]
    const rc = this.wrapIntent(creep, 'harvest', mineral)
    if (rc === ERR_NOT_ENOUGH_RESOURCES || rc === bootstrap.WARN_INTENDED_EXHAUSTED) {
      extractor.room.memory.mlvl = 0
    }

    return rc
  }

  return ERR_INVALID_TARGET
}

mineralHarvestController.targets = function (room) {
  if (room.memory.mlvl === 0) {
    return []
  }

  return room.find(
    FIND_STRUCTURES,
    {
      filter: function (structure) {
        return structure.structureType === STRUCTURE_EXTRACTOR && structure.isActiveSimple()
      }
    }
  )
}

mineralHarvestController.filterCreep = function (creep) {
  return creep.memory.minr === true && this._isHarvestAble(creep)
}

mineralHarvestController.register()

module.exports = mineralHarvestController
