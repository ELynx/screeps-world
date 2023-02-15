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
    @param {Room} to what.
    @return {Array} body.
    **/
  worker: function (room) {
    const energyLevel = room.memory.elvl

    // 0 or 1
    if (energyLevel <= 1) {
      // 250  100   50     50    50
      return [WORK, CARRY, MOVE, MOVE]
    }

    // 2
    if (energyLevel === 2) {
      // 500  100   100   50     50     50    50    50    50
      return [WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE]
    }

    // 3+
    // 750  100   100   100   50     50     50     50    50    50    50    50    50
    return [WORK, WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE]
  },

  /**
    BODY Restocker.
    @param {Room} to what.
    @return {Array} body.
    **/
  restocker: function (room) {
    const energyLevel = room.memory.elvl

    // 0, 1 or 2
    if (energyLevel <= 2) {
      return this.worker(room)
    }

    // 3
    if (energyLevel === 3) {
      // special case, limp a bit
      // 800  100   100   100   100   100   50     50    50    50    50    50
      return [WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE]
    }

    // 4+
    // target is 3000 / 300 / 2 = 5 WORK body parts
    // 850  100   100   100   100   100   50     50    50    50    50    50    50
    return [WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE]
  },

  /**
    BODY Miner.
    @param {Room} to what.
    @return {Array} body.
    **/
  miner: function (room) {
    const energyLevel = room.memory.elvl

    // 0, 1, 2, 3 or 4
    if (energyLevel <= 4) {
      return this.restocker(room)
    }

    // 5 or 6
    if (energyLevel <= 6) {
      // 1700
      return [
      // 100   100   100   100   100   100   100   100   100   100
        WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK,
        // 50     50
        CARRY, CARRY,
        // 50    50    50    50    50    50    50    50    50    50    50    50
        MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE]
    }

    // 7+
    // 3400
    return [
    // 100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100
      WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK,
      // 50     50     50     50
      CARRY, CARRY, CARRY, CARRY,
      // 50    50    50    50    50    50    50    50    50    50    50    50    50    50    50    50    50    50    50    50    50    50    50    50
      MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE]
  }
}

module.exports = bodywork
