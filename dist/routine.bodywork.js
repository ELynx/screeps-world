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

const MakeWCM = (work, carry, move = work + carry) => {
  const partsWork = new Array(work)
  partsWork.fill(WORK)

  const partsCarry = new Array(carry)
  partsCarry.fill(CARRY)

  const partsMove = new Array(move)
  partsMove.fill(MOVE)

  return partsWork.concat(partsCarry).concat(partsMove)
}

const Body11x = MakeWCM(1, 1)
const Body22x = MakeWCM(2, 2)
const Body33x = MakeWCM(3, 3)
const Body66x = MakeWCM(6, 6)
const BodyBBx = MakeWCM(12, 12)

const Body616 = MakeWCM(6, 1, 6)
const Body211 = MakeWCM(2, 1, 1)
const Body412 = MakeWCM(4, 1, 2)
const Body613 = MakeWCM(6, 1, 3)
const BodyB26 = MakeWCM(12, 2, 6)
const BodyH39 = MakeWCM(18, 3, 9)

const Body666 = MakeWCM(6, 6, 6)
const Body888 = MakeWCM(8, 8, 8)
const Body333 = MakeWCM(3, 3, 3)

const Body5A5 = MakeWCM(5, 10, 5)
const BodyAJA = MakeWCM(10, 20, 10)

const BodyA24 = MakeWCM(10, 2, 4)
const BodyE36 = MakeWCM(15, 3, 6)

const bodywork = {
  worker (room) {
    const energy = room.extendedAvailableEnergyCapacity()
    const sourceLevel = room.memory.slvl || 0

    // target is zero fatigue under full load

    // call for new or foreign room
    if (energy === 0) {
      // 750
      return _.shuffle(Body33x)
    }

    if (energy < 500) {
      // 250
      return _.shuffle(Body11x)
    }

    if (energy < 750) {
      // 500
      return _.shuffle(Body22x)
    }

    if (energy < 1500) {
      // 750
      return _.shuffle(Body33x)
    }

    if (energy < 3000 || sourceLevel < 2) {
      // 1500
      return _.shuffle(Body66x)
    }

    // 3000 / 48 parts
    return _.shuffle(BodyBBx)
  },

  harvester_my (room) {
    const energy = room.extendedAvailableEnergyCapacity()
    const sourceLevel = room.memory.slvl || 0

    // call for new room
    if (energy === 0) {
      // target is "default" speed
      // target is zero fatigue empty, fast arrival
      return _.shuffle(Body616)
    }

    if (energy < 550) {
      // target is half speed empty
      // 300
      return _.shuffle(Body211)
    }

    if (energy < 800) {
      // 550
      return _.shuffle(Body412)
    }

    if (energy < 1600) {
      // target is a bit above optimal harvest speed
      // target is half speed empty
      // 800
      return _.shuffle(Body613)
    }

    if (energy < 2400 || sourceLevel < 2) {
      // target is double of above
      // target is half speed empty
      // 1600
      return _.shuffle(BodyB26)
    }

    // target is triple of above
    // target is half speed empty
    // 2400
    return _.shuffle(BodyH39)
  },

  harvester_other (room) {
    // target is always 250 ticks, leaving 50 ticks for repairs
    // w eq c so there are no "odd" numbers on capacity

    // target is zero fatigue empty

    if (room.ownedOrReserved()) {
      // target is 3000 / 250 / 2 = 6 WORK body parts
      return t_.shuffle(Body666)
    }

    if (room.sourceKeeper()) {
      // target is 4000 / 250 / 2 = 8 WORK body parts
      return _.shuffle(Body888)
    }

    // target is 1500 / 250 / 2 = 3 WORK body parts
    return _.shuffle(Body333)
  },

  miner (room) {
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
      return _.shuffle(Body5A5)
    }

    // 2500
    return _.shuffle(BodyAJA)
  },

  upgrader (room) {
    const energy = room.extendedAvailableEnergyCapacity()
    const sourceLevel = room.memory.slvl || 0

    // reduced size to not overload by spawning
    if (sourceLevel < 2) {
      if (energy < 1300) {
        return []
      }

      // target is third speed
      // 1300
      return _.shuffle(BodyA24)
    }

    if (energy < 1950) {
      return []
    }

    // 15 WORK for maximum upgrade
    // 3 CARRY for 150 capacity to minimize withdraw
    // target is third speed

    // 1950
    return _.shuffle(BodyE36)
  }
}

module.exports = bodywork
