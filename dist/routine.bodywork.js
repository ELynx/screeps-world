'use strict'

/**
MEMO - body part cost

MOVE            50
WORK            100
ATTACK          80
CARRY           50
HEAL            250
RANGED_ATTACK   150
TOUGH           10
CLAIM           600
**/

const bodywork = {
  /**
    BODY Universal worker.
    @param {integer} energyLevel.
    @return {Array} body.
    **/
  worker: function (energyLevel) {
    if (energyLevel <= 1) {
      // 250  100   50     50    50
      return [WORK, CARRY, MOVE, MOVE]
    }

    if (energyLevel === 2) {
      // 500  100   100   50     50     50    50    50    50
      return [WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE]
    }

    // 3 and above
    // 750  100   100   100   50     50     50     50    50    50    50    50    50
    return [WORK, WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE]
  },

  /**
    BODY Restocker.
    @param {integer} level.
    @return {Array} body.
    **/
  restocker: function (energyLevel) {
    if (energyLevel <= 1) {
      return [WORK, CARRY, MOVE]
    }

    if (energyLevel === 2) {
      // 550  100   100   100   50     50    50    50    50
      return [WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE]
    }

    // special case, limp a bit
    if (energyLevel === 3) {
      // 800  100   100   100   100   100   50     50    50    50    50    50
      return [WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE]
    }

    // 4 and above
    // 850  100   100   100   100   100   50     50    50    50    50    50    50
    return [WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE]
  },

  /**
    BODY Miner.
    @param {integer} level.
    @return {Array} body.
    **/
  miner: function (energyLevel) {
    return this.restocker(energyLevel)
  }
}

module.exports = bodywork
