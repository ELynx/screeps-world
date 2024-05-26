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

    // target is zero fatigue under full load

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
      // target is "default" speed
      // target is zero fatigue empty, fast arrival
      return this.makeWCM(6, 1, 6)
    }

    if (energy < 550) {
      // target is half speed empty
      // 300
      return this.makeWCM(2, 1, 1)
    }

    if (energy < 800) {
      // 550
      return this.makeWCM(4, 1, 2)
    }

    if (energy < 1600) {
      // target is a bit above optimal harvest speed
      // target is half speed empty
      // 800
      return this.makeWCM(6, 1, 3)
    }

    if (energy < 2400 || sourceLevel < 2) {
      // target is double of above
      // target is half speed empty
      // 1600
      return this.makeWCM(12, 2, 6)
    }

    // target is triple of above
    // target is half speed empty
    // 2400
    return this.makeWCM(18, 3, 9)
  },

  harvester_other: function (room) {
    // target is always 250 ticks, leaving 50 ticks for repairs
    // w eq c so there are no "odd" numbers on capacity

    // target is zero fatigue empty

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

    // N work to N move -> 50 ticks
    // N work fills 2N carry in 2c * 50space * 1power * 5cooldown -> 500 ticks
    // N work + 2N carry to N move -> 150 ticks back
    // 700 ticks + bs -> 2 trips per cycle

    if (energy < 1250) {
      return []
    }

    if (energy < 2500 || sourceLevel < 2) {
      // 1250
      return this.makeWCM(5, 10, 5)
    }

    // 2500
    return this.makeWCM(10, 20, 10)
  },

  upgrader: function (room) {
    const energy = room.extendedAvailableEnergyCapacity()
    const sourceLevel = room.memory.slvl || 0

    // reduced size to not overload by spawning
    if (sourceLevel < 2) {
      if (energy < 1300) {
        return []
      }

      // target is third speed
      // 1300
      return this.makeWCM(10, 2, 4)
    }

    if (energy < 1950) {
      return []
    }

    // 15 WORK for maximum upgrade
    // 3 CARRY for 150 capacity to minimize withdraw
    // target is third speed

    // 1950
    return this.makeWCM(15, 3, 6)
  }
}

module.exports = bodywork
