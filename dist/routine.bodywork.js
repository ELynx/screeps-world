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
    // cannot produce creeps -> no level regulation
    if (!room.my) {
      // 750  100   100   100   50     50     50     50    50    50    50    50    50
      return [WORK, WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE]
    }

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
    // cannot produce creeps -> no level regulation
    if (!room.my) {
      const sourceEnergyCapacity = room.sourceEnergyCapacity()
      const targetTime = Math.max(1, ENERGY_REGEN_TIME - 50) // suppose 50 is spent on travel
      const targetWork = Math.ceil(sourceEnergyCapacity / targetTime / HARVEST_POWER)

      const work = Math.min(targetWork, 24)
      const carry = 1
      const move = work + carry

      const a = new Array(work)
      a.fill(WORK)

      const b = new Array(carry)
      b.fill(CARRY)

      const c = new Array(move)
      c.fill(MOVE)

      return a.concat(b).concat(c)
    }

    const energyLevel = room.memory.elvl

    // 0 or 1
    if (energyLevel <= 1) {
      // 250  100   50     50    50
      return [WORK, CARRY, MOVE, MOVE]
    }

    // 2
    if (energyLevel === 2) {
      // 550  100   100   100   50     50    50    50    50
      return [WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE]
    }

    // TODO constant-ise

    // 3
    if (energyLevel === 3) {
      // special case, limp a bit when loaded
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

    // 0 or 1
    if (energyLevel <= 1) {
      // 250  100   50     50    50
      return [WORK, CARRY, MOVE, MOVE]
    }

    // 2
    if (energyLevel === 2) {
      // 550  100   100   100   50     50    50    50    50
      return [WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE]
    }

    // 3
    if (energyLevel === 3) {
      // special case, limp a bit when loaded
      // 800  100   100   100   100   100   50     50    50    50    50    50
      return [WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE]
    }

    // 4
    if (energyLevel === 4) {
      // 850  100   100   100   100   100   50     50    50    50    50    50    50
      return [WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE]
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
