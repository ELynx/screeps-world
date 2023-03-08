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
  makeWCM: function (work, carry, move = work + carry) {
    const a = new Array(work)
    a.fill(WORK)

    const b = new Array(carry)
    b.fill(CARRY)

    const c = new Array(move)
    c.fill(MOVE)

    return a.concat(b).concat(c)
  },

  worker: function (room) {
    const energy = room.extendedAvailableEnergyCapacity()

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
      return this.makeWCM(2, 2)
    }

    if (energy < 1500) {
      return this.makeWCM(3, 3)
    }

    if (energy < 3000) {
      return this.makeWCM(6, 6)
    }

    return this.makeWCM(12, 12)
  },

  restocker: function (room) {
    // cannot produce creeps -> no level regulation
    if (!room.my) {
      if (room.ownedOrReserved()) {
        // target is 3000 / 250 / 2 = 6 WORK body parts
        // 1000
        return this.makeWCM(6, 1)
      }

      if (room.sourceKeeper()) {
        // target is 4000 / 250 / 2 = 8 WORK body parts
        // 1300
        return this.makeWCM(8, 1)
      }

      // target is 1500 / 250 / 2 = 3 WORK body parts
      // 550
      return this.makeWCM(3, 1)
    }

    const energy = room.extendedAvailableEnergyCapacity()

    // call for new room
    if (energy === 0) {
      // target is 3000 / 300 / 2 = 5 WORK body parts
      // 850
      return this.makeWCM(5, 1)
    }

    if (energy < 550) {
      // 250
      return this.makeWCM(1, 1)
    }

    if (energy < 800) {
      return this.makeWCM(3, 1)
    }

    if (energy < 850) {
      // special case, limp a bit when loaded
      return this.makeWCM(5, 1, 5)
    }

    // target is 3000 / 300 / 2 = 5 WORK body parts
    return this.makeWCM(5, 1)
  },

  miner: function (room) {
    if (!room.my) {
      // if decision is ever made to mide outside, it must be done with superior machines
      // 3400
      return this.makeWCM(20, 4)
    }

    const energy = room.extendedAvailableEnergyCapacity()

    if (energy < 550) {
      // 250
      return this.makeWCM(1, 1)
    }

    if (energy < 800) {
      return this.makeWCM(3, 1)
    }

    if (energy < 850) {
      // special case, limp a bit when loaded
      return this.makeWCM(5, 1, 5)
    }

    if (energy < 1700) {
      return this.makeWCM(5, 1)
    }

    if (energy < 3400) {
      return this.makeWCM(10, 2)
    }

    return this.makeWCM(20, 4)
  }
}

module.exports = bodywork
