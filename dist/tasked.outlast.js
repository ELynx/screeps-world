'use strict'

const bootstrap = require('./bootstrap')

const Tasked = require('./tasked.template')

const outlast = new Tasked('outlast')

outlast._defaultAction = function (creep) {
  if (creep.memory.shel <= 0) return

  if (creep.hits < creep.hitsMax) {
    creep.heal(creep)
  } else {
    const creeps = creep.room.find(
      FIND_CREEPS,
      {
        filter: _.bind(
          function (someCreep) {
            return someCreep.myOrAlly() &&
                   someCreep.hits < someCreep.hitsMax &&
                   someCreep.pos.inRangeTo(this, 3)
          },
          creep
        )
      }
    )
    creep.healClosest(creeps)
  }
}

outlast.creepPrepare = function (creep) {
  this._flagCountCreep(creep)
  creep.memory.shel = creep.getActiveBodyparts(HEAL) * HEAL_POWER
}

outlast.creepAtDestination = function (creep) {
  this._defaultAction(creep)
  creep.memory._blk = true
}

outlast.creepRoomTravel = function (creep) {
  this._defaultAction(creep)

  if (!creep.memory._blk) {
    this._creepRoomTravel(creep)
    return
  }

  // don't waste CPU
  if (!creep.__canMove) return

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

      creep.moveToWrapper(pos, { range })
    }
  }

  if (autoMove) {
    this._creepRoomTravel(creep)
  }
}

outlast.flagPrepare = function (flag) {
  return this._flagCountBasic(flag, 10)
}

outlast.makeBody = function (spawn) {
  const elvl = spawn.room.memory.elvl

  if (elvl < 5) {
    return []
  }

  // takes 300 damage
  // heal damage in 5 turns
  // 1500 50    50    50    50    50    250   250   250   250   250
  return [MOVE, MOVE, MOVE, MOVE, MOVE, HEAL, HEAL, HEAL, HEAL, HEAL]
}

outlast.register()

module.exports = outlast
