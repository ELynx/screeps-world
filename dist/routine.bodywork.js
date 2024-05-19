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

/**
MEMO - constants

CONTROLLER_MAX_UPGRADE_PER_TICK 15
**/

const bodywork = {
  makeWCM: function (work, carry, move = work + carry) {
    const partsWork = new Array(work)
    partsWork.fill(WORK)

    const partsCarry = new Array(carry)
    partsCarry.fill(CARRY)

    const partsMove = new Array(move)
    partsMove.fill(MOVE)

    return _.shuffle(partsWork.concat(partsCarry).concat(partsMove))
  },

  worker: function (room) {
    const energy = room.extendedAvailableEnergyCapacity()
    const sourceLevel = room.memory.slvl || 0

    // call for new or foreign room
    if (energy === 0) {
      // 750
      return this.makeWCM(3, 3)
    }

    if (energy < 500) {
      // 250
      return this.makeWCM(1, 1)
    }

    if (energy < 750) {
      // 500
      return this.makeWCM(2, 2)
    }

    if (energy < 1500) {
      // 750
      return this.makeWCM(3, 3)
    }

    if (energy < 3000 || sourceLevel < 2) {
      // 1500
      return this.makeWCM(6, 6)
    }

    // 3000 / 48 parts
    return this.makeWCM(12, 12)
  },

  harvester_my: function (room) {
    const energy = room.extendedAvailableEnergyCapacity()
    const sourceLevel = room.memory.slvl || 0

    // call for new room
    if (energy === 0) {
      return this.makeWCM(5, 1, 5)
    }

    if (energy < 500) {
      // 200
      return this.makeWCM(1, 1, 1)
    }

    if (energy < 800) {
      // 500
      return this.makeWCM(3, 1, 3)
    }

    if (energy < 1600) {
      // target is 3000 / 300 / 2 = 5 WORK body parts
      // 800
      return this.makeWCM(5, 1, 5)
    }

    if (energy < 2400 || sourceLevel < 2) {
      // target is double speed
      // 1600
      return this.makeWCM(10, 2, 10)
    }

    // target is triple speed
    // 2400
    return this.makeWCM(15, 3, 15)
  },

  harvester_other: function (room) {
    // target is always 250 ticks, leaving 50 ticks for repairs
    // w eq c so there are no "odd" numbers on capacity

    if (room.ownedOrReserved()) {
      // target is 3000 / 250 / 2 = 6 WORK body parts
      return this.makeWCM(6, 6, 6)
    }

    if (room.sourceKeeper()) {
      // target is 4000 / 250 / 2 = 8 WORK body parts
      return this.makeWCM(8, 8, 8)
    }

    // target is 1500 / 250 / 2 = 3 WORK body parts
    return this.makeWCM(3, 3, 3)
  },

  miner: function (room) {
    const energy = room.extendedAvailableEnergyCapacity()
    const sourceLevel = room.memory.slvl || 0

    if (energy < 1250) {
      return []
    }

    if (energy < 2500 || sourceLevel < 2) {
      // 1250
      return this.makeWCM(5, 5)
    }

    // 2500
    return this.makeWCM(10, 10)
  },

  upgrader: function (room) {
    const energy = room.extendedAvailableEnergyCapacity()
    const sourceLevel = room.memory.slvl || 0

    // reduced size to not overload by spawning
    if (sourceLevel < 2) {
      if (energy < 1600) {
        return []
      }

      // 1600
      return this.makeWCM(10, 2, 10)
    }

    if (energy < 2400) {
      return []
    }

    // 15 WORK for maximum upgrade
    // 3 CARRY for 150 capacity to minimize withdraw
    // 15 MOVE to avoid fatigue on the way to

    // 2400
    return this.makeWCM(15, 3, 15)
  }
}

module.exports = bodywork
