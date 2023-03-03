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
    const energy = room.extendedAvailableEnergyCapacity()

    // call for new or foreign room
    if (energy === 0) {
      // 750  100   100   100   50     50     50     50    50    50    50    50    50
      return [WORK, WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE]
    }

    if (energy < 500) {
      // 250  100   50     50    50
      return [WORK, CARRY, MOVE, MOVE]
    }

    if (energy < 750) {
      // 500  100   100   50     50     50    50    50    50
      return [WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE]
    }

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
      if (room.ownedOrReserved()) {
        // target is 3000 / 250 / 2 = 6 WORK body parts
        // 1000 100   100   100   100   100   100   50     50    50    50    50    50    50    50
        return [WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE]
      }

      if (room.sourceKeeper()) {
        // target is 4000 / 250 / 2 = 8 WORK body parts
        // 1300 100   100   100   100   100   100   100   100   50     50    50    50    50    50    50    50    50    50
        return [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE]
      }

      // target is 1500 / 250 / 2 = 3 WORK body parts
      // 550  100   100   100   50     50    50    50    50
      return [WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE]
    }

    const energy = room.extendedAvailableEnergyCapacity()

    // call for new room
    if (energy === 0) {
      // target is 3000 / 300 / 2 = 5 WORK body parts
      // 850  100   100   100   100   100   50     50    50    50    50    50    50
      return [WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE]
    }

    if (energy < 550) {
      // 250  100   50     50    50
      return [WORK, CARRY, MOVE, MOVE]
    }

    if (energy < 800) {
      // 550  100   100   100   50     50    50    50    50
      return [WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE]
    }

    if (energy < 850) {
      // special case, limp a bit when loaded
      // 800  100   100   100   100   100   50     50    50    50    50    50
      return [WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE]
    }

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
    if (!room.my) {
    // if decision is ever made to mide outside, it must be done with superior machines
    // 3400
      return [
        // 100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100
        WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK,
        // 50     50     50     50
        CARRY, CARRY, CARRY, CARRY,
        // 50    50    50    50    50    50    50    50    50    50    50    50    50    50    50    50    50    50    50    50    50    50    50    50
        MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE]
    }

    const energy = room.extendedAvailableEnergyCapacity()

    if (energy < 550) {
      // 250  100   50     50    50
      return [WORK, CARRY, MOVE, MOVE]
    }

    if (energy < 800) {
      // 550  100   100   100   50     50    50    50    50
      return [WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE]
    }

    if (energy < 850) {
      // special case, limp a bit when loaded
      // 800  100   100   100   100   100   50     50    50    50    50    50
      return [WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE]
    }

    if (energy < 1700) {
      // 850  100   100   100   100   100   50     50    50    50    50    50    50
      return [WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE]
    }

    if (energy < 3400) {
      // 1700
      return [
      // 100   100   100   100   100   100   100   100   100   100
        WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK,
        // 50     50
        CARRY, CARRY,
        // 50    50    50    50    50    50    50    50    50    50    50    50
        MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE]
    }

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
