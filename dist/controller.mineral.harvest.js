'use strict'

const bootstrap = require('./bootstrap')

const Controller = require('./controller.template')

const mineralHarvestController = new Controller('mineral.harvest')

mineralHarvestController.actRange = 1

mineralHarvestController.act = function (extractor, creep) {
  // STRATEGY wait for full take, keep on target
  if (extractor.cooldown > 0) {
    return OK
  }

  const minerals = extractor.pos.lookFor(LOOK_MINERALS)

  // because extractor has only one mineral underneath
  // eslint-disable-next-line no-unreachable-loop
  for (const mineral of minerals) {
    const rc = this.wrapIntent(creep, 'harvest', mineral)
    if (rc === bootstrap.WARN_BOTH_EXHAUSED ||
        rc === bootstrap.WARN_INTENDED_EXHAUSTED ||
        rc === bootstrap.ERR_INTENDED_EXHAUSTED ||
        rc === ERR_NOT_ENOUGH_RESOURCES) {
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

  // don't mine in room with fight
  if (room._fight_) {
    return []
  }

  // shortcut for `my`
  if (room._my_) {
    if (room.extractor && room.extractor.isActiveSimple) {
      return [room.extractor]
    } else {
      return []
    }
  }

  return room.find(
    FIND_STRUCTURES,
    {
      filter: structure => {
        return structure.structureType === STRUCTURE_EXTRACTOR && structure.isActiveSimple
      }
    }
  )
}

mineralHarvestController.filterCreep = function (creep) {
  return this._isMiner(creep) && this._isHarvestAble(creep)
}

mineralHarvestController.register()

module.exports = mineralHarvestController
