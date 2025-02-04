'use strict'

const bootstrap = require('./bootstrap')

const Tasked = require('./tasked.template')

const outlast = new Tasked('outlast')

outlast._defaultAction = function (creep) {
  // this means creep is destroyed
  if (creep.memory.shel <= 0) return

  let fastRush = false
  if (creep.room.controller && creep.room.controller.signedByOwner()) {
    if (creep.room.controller.sign.text === Game.iff.BotSignatureOvermind) {
      fastRush = true
    }
  }

  if (creep.memory._blk && creep.hits >= creep.hitsMax) {
    const now = creep.memory.octr || 0
    creep.memory.octr = now + 1
  }

  if (creep.memory.octr && creep.memory.octr > (fastRush ? 3 : 10)) {
    creep.memory.flag = 'strelok_bash'
  }

  if (creep.hits < creep.hitsMax) {
    const rc = creep.heal(creep)
    creep.__canMelee = creep.__canMelee && rc !== OK
  } else {
    const allCreeps = creep.room.find(FIND_CREEPS)
    const damagedCreeps = _.filter(
      allCreeps,
      someCreep => {
        return someCreep.myOrAlly() &&
               someCreep.hits < someCreep.hitsMax &&
               someCreep.pos.inRangeTo(creep, 3)
      }
    )
    const rc = creep.healClosest(damagedCreeps)
    creep.__canMelee = creep.__canMelee && rc !== OK
  }

  if (creep.__canMelee) {
    const allCreeps = creep.room.find(FIND_CREEPS)
    const hostileCreeps = _.filter(allCreeps, someCreep => someCreep.hostile)

    if (hostileCreeps.length > 0) {
      creep.meleeAdjacent(hostileCreeps)
    }
  }
}

outlast.creepPrepare = function (creep) {
  this._flagCountCreep(creep)
  creep.memory.shel = creep.getActiveBodyparts(HEAL) * HEAL_POWER
  creep.__canMelee = creep.getActiveBodyparts(ATTACK)
}

outlast.creepAtDestination = function (creep) {
  creep.memory._blk = true
  this._defaultAction(creep)
}

outlast.creepRoomTravel = function (creep) {
  this._defaultAction(creep)

  if (!creep.memory._blk) {
    this._creepRoomTravel(creep)
    return
  }

  // don't waste CPU
  if (!creep._can_move_) return

  // let room travel do the step
  let autoMove = true

  const damage = creep.hitsMax - creep.hits
  const selfCanHeal = creep.memory.shel
  if (damage <= selfCanHeal || creep.ticksToLive === 2) {
    let erasePath = false

    // stay on transit
    if (creep.pos.x === 0) autoMove = false
    else if (creep.pos.x === 49) autoMove = false
    else if (creep.pos.y === 0) autoMove = false
    else if (creep.pos.y === 49) autoMove = false
    // step towards room, check for collisions
    else if (creep.pos.x === 1) erasePath = true
    else if (creep.pos.x === 48) erasePath = true
    else if (creep.pos.y === 1) erasePath = true
    else if (creep.pos.y === 48) erasePath = true

    if (erasePath) bootstrap.imitateMoveErase(creep)
  } else {
    let flee = false

    // step away from transit
    if (creep.pos.x === 0) flee = true
    else if (creep.pos.x === 49) flee = true
    else if (creep.pos.y === 0) flee = true
    else if (creep.pos.y === 49) flee = true
    // stay one step away from transit
    else if (creep.pos.x === 1) autoMove = false
    else if (creep.pos.x === 48) autoMove = false
    else if (creep.pos.y === 1) autoMove = false
    else if (creep.pos.y === 48) autoMove = false

    if (flee) {
      autoMove = false
      const pos = creep.room.getControlPos()
      const range = pos.offBorderDistance()

      creep.moveToWrapper(
        pos,
        {
          plainCost: 1,
          swampCost: 1,
          ignoreRoads: true,
          range
        }
      )
    }
  }

  if (autoMove) {
    this._creepRoomTravel(creep)
  }
}

outlast.flagPrepare = function (flag) {
  if (flag.room) {
    const allStructures = flag.room.find(FIND_STRUCTURES)
    const hasTowers = _.some(allStructures, _.matchesProperty('structureType', STRUCTURE_TOWER))
    if (!hasTowers) {
      return this.FLAG_IGNORE
    }
  }

  return this._flagCountBasic(flag, 100)
}

outlast.makeBody = function (room) {
  const energy = room.extendedAvailableEnergyCapacity()

  if (energy < 1630) return []

  // takes 300 damage
  // heal damage in 5 turns
  // 1630 50    50    50    50    50    50    80      250   250   250   250   250
  return [MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, ATTACK, HEAL, HEAL, HEAL, HEAL, HEAL]
}

outlast.register()

module.exports = outlast
