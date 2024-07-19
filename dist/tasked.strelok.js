'use strict'

const Tasked = require('./tasked.template')

const strelok = new Tasked('strelok')

strelok.combatTravel = true

strelok.breachedExtraCreeps = 1

strelok.bodyName = function (flag) {
  // room service call
  const pos = flag.pos
  if (pos.x === 49 && pos.y === 49) return this.id + '_2'

  return this.id
}

strelok.prepare = function () {
  this.roomTargets = { }
  this.roomWounded = { }
  this.roomNoHurt = { }

  this.roomBoring = { }
}

strelok.creepPrepare = function (creep) {
  creep.__canRanged = creep.getActiveBodyparts(RANGED_ATTACK) > 0
  creep.__canHeal = creep.getActiveBodyparts(HEAL) > 0
  creep.__canHealRanged = creep.__canHeal
  creep.__canMelee = creep.getActiveBodyparts(ATTACK) > 0

  // if hit retaliate immediately
  // check is early to be caught in following code
  if (creep.hits < creep.hitsMax) {
    creep.setControlRoom(creep.room.name)
  } else {
    if (creep.flag) {
      // when healed, continue
      creep.setControlRoom(creep.flag.pos.roomName)
    }
  }
}

strelok.creepAtDestination = function (creep) {
  const dest = creep.room.name

  if (!this.roomTargets[dest]) {
    const creeps = creep.room.find(FIND_CREEPS)

    const targetCreeps = _.filter(
      creeps,
      creep1 => creep1.hostile
    )

    const structures = creep.room.find(FIND_STRUCTURES)
    const targetStructures = _.filter(
      structures,
      structure => {
        // ignore everything without hit points
        if (!structure.hits) return false
        if (structure.isPublic) return false

        const structureType = structure.structureType

        // STRATEGY ignore resource management, even though it can be military
        if (structureType === STRUCTURE_CONTAINER ||
            structureType === STRUCTURE_EXTRACTOR ||
            structureType === STRUCTURE_FACTORY ||
            structureType === STRUCTURE_LAB ||
            structureType === STRUCTURE_LINK ||
            structureType === STRUCTURE_STORAGE ||
            structureType === STRUCTURE_TERMINAL) {
          return false
        }

        // STRATEGY only aggro can make this target walls and ramparts
        if (structureType === STRUCTURE_WALL ||
            structureType === STRUCTURE_RAMPART
        ) {
          return false
        }

        // please don't hunt these...
        if (structureType === STRUCTURE_ROAD ||
            structureType === STRUCTURE_PORTAL) {
          return false
        }

        return structure.hostile
      }
    )

    let targets = targetCreeps.concat(targetStructures)

    if (creep.room.aggro().length > 0) {
      targets = targets.concat(creep.room.aggro())
    }

    const wounded = _.filter(
      creeps,
      creep1 => creep1.myOrAlly() && (creep1.hits < creep1.hitsMax)
    )

    const noHurt = _.filter(
      creeps,
      creep1 => creep1.allyOrNeutral()
    )

    this.roomTargets[dest] = targets
    this.roomWounded[dest] = wounded
    this.roomNoHurt[dest] = noHurt
  }

  const rushPos = creep.getControlPos()
  const targets = this.roomTargets[dest]

  const fireTarget = creep.pos.findClosestByRange(targets)

  let moveTarget
  const prio = _.filter(
    targets,
    target => target.pos.x === rushPos.x && target.pos.y === rushPos.y
  )

  if (prio.length > 0) {
    moveTarget = prio[0]
  } else {
    moveTarget = fireTarget
  }

  if (fireTarget) {
    const rangeToFireTarget = creep.pos.getRangeTo(fireTarget)

    if (creep.__canRanged) {
      if (rangeToFireTarget <= 3) {
        let mass

        // find out if mass will hurt a non-target creep
        // in room attack, there is less non-targets than targets
        // check this list first to save some ticks
        for (let i = 0; i < this.roomNoHurt.length; ++i) {
          const noHurt = this.roomNoHurt[i]
          if (creep.pos.inRangeTo(noHurt, 3)) {
            mass = false
            break
          }
        }

        // find out if mass will hit a hostile
        for (let i = 0; i < targets.length && mass === undefined; ++i) {
          const secondary = targets[i]
          if (secondary.id === fireTarget.id) continue
          if (secondary.unowned) continue // mass does not hit unowned
          if (creep.pos.inRangeTo(secondary, 3)) {
            mass = true
            break
          }
        }

        // do actual attack
        let rc
        if (mass) {
          rc = creep.rangedMassAttack()
        } else {
          rc = creep.rangedAttack(fireTarget)
        }

        creep.__canHealRanged = creep.__canHealRanged && rc !== OK
      } // end of traget in firing range
    } // end of if has ranged bpart

    if (creep._can_move_) {
      // ballet when close
      if (rangeToFireTarget <= 4 && fireTarget.id === moveTarget.id) {
        let flee
        let range

        const targetIsStructure = fireTarget.structureType !== undefined
        const targetIsNotMelee = fireTarget.body && !_.some(fireTarget.body, _.matchesProperty('type', ATTACK))

        if (targetIsStructure && fireTarget._aggro_) {
          if (rangeToFireTarget > 2) {
            flee = false
            range = 2
          } else if (rangeToFireTarget < 2) {
            flee = true
            range = 2
          }
        } else if (targetIsStructure || targetIsNotMelee) {
          if (rangeToFireTarget > 1) {
            flee = false
            range = 1
          }
        } else {
          if (rangeToFireTarget >= 3) {
            flee = false
            range = 2
          } else {
            flee = true
            range = 2
          }
        }

        if (flee !== undefined) {
          creep.moveToWrapper(
            fireTarget,
            {
              flee,
              maxRooms: 1,
              range,
              reusePath: 0
            }
          )
        }
      } else {
        // STRATEGY follow creep tightly
        const reusePath = moveTarget.structureType ? _.random(3, 5) : 0
        // STRATEGY bump into structure
        const range = moveTarget.structureType ? 1 : 3

        creep.moveToWrapper(
          moveTarget,
          {
            maxRooms: 1,
            range,
            reusePath
          }
        )
      }
    } else {
      creep.fatigueWrapper()
    }
    // end of if target
  } else {
    // no targets
    this._coastToHalt(creep)

    // if creep lived long enough
    if (creep.ticksToLive < 2) {
      this.roomBoring[dest] = true
    }
  } // end of if no target

  if (creep.__canHeal || creep.__canHealRanged) {
    const healTargets = this.roomWounded[dest]

    let rc = ERR_TIRED
    if (creep.__canHeal && creep.hits < creep.hitsMax) {
      // priority 1 - heal this
      rc = creep.heal(creep)
    } else if (creep.__canHealRanged) {
      // priority 2 - heal anyone else
      // actually check for creep directly nearby is inside
      rc = creep.healClosest(healTargets)
    } else if (creep.__canHeal) {
      // priority 3 - heal anyone else directly nearby - in case of ranged attack was fired
      rc = creep.healAdjacent(healTargets)
    }

    creep.__canMelee = creep.__canMelee && rc !== OK
  }

  if (creep.__canMelee && targets.length > 0) {
    creep.meleeAdjacent(targets)
  }
}

strelok.creepRoomTravel = function (creep) {
  this._creepRoomTravel(creep)

  if (creep.__canHeal) {
    if (creep.hits < creep.hitsMax) {
      creep.heal(creep)
    } else if (this.roomWounded[creep.room.name] &&
               this.roomWounded[creep.room.name].length > 0) {
      creep.healClosest(this.roomWounded[creep.room.name])
    }
  }
}

strelok.flagPrepare = function (flag) {
  const want = flag.getValue()

  // automatically stop 1 target attacks
  if (want <= 1 && this.roomBoring[flag.pos.roomName]) {
    return this.FLAG_REMOVE
  }

  if (this.roomBoring[flag.pos.roomName]) {
    return this.FLAG_IGNORE
  }

  return this.FLAG_SPAWN
}

strelok.makeBody = function (room, limit = undefined) {
  const energy = room.extendedAvailableEnergyCapacity()

  if (energy < 500) {
    // 200  50    150
    return [MOVE, RANGED_ATTACK]
  }

  if (energy < 700) {
    // 500  50    50    150            250
    return [MOVE, MOVE, RANGED_ATTACK, HEAL]
  }

  if (!this.__bodyCache) {
    this.__bodyCache = { }
  }

  const roomLimit = Math.ceil((energy - 300) / 500)
  const stepLimit = limit ? Math.min(roomLimit, limit) : roomLimit

  const cached = this.__bodyCache[stepLimit]
  if (cached) {
    return cached
  }

  let tough = 0
  let move = 0
  let ranged = 0
  let melee = 0
  let heal = 0

  // 700 for base combo and 250 per next level
  let budget = 700 + 250 * stepLimit

  // add heal + two ranged combo
  // 700 is 150 ranged x 2 + 250 heal x 1 + 50 move x 3
  let once = true
  while (budget >= 700 && (tough + move + ranged + melee + heal <= 50 - 6)) {
    move = move + 3
    ranged = ranged + 2
    heal = heal + 1

    budget = budget - 700

    if (once) {
      once = false
      // add melee for extra havoc
      // 190 is 80 melee x 1 + 10 tough x 1 + 50 move x 2
      if (budget >= 190 && (tough + move + ranged + melee + heal <= 50 - 4)) {
        tough = tough + 1
        move = move + 2
        melee = melee + 1

        budget = budget - 190
      }
    }
  }

  // add ranged
  // 200 is 150 ranged x 1 + 50 move x 1
  while (budget >= 200 && (tough + move + ranged + melee + heal <= 50 - 2)) {
    move = move + 1
    ranged = ranged + 1

    budget = budget - 200
  }

  // add move padding
  while (budget >= 50 && (tough + move + ranged + melee + heal <= 50 - 1)) {
    move = move + 1

    budget = budget - 50
  }

  // add tough padding
  if (budget >= 10 && (tough + move + ranged + melee + heal <= 50 - 1) && (tough + ranged + melee + heal < move)) {
    tough = tough + 1

    budget = budget - 10
  }

  const partsTough = new Array(tough)
  partsTough.fill(TOUGH)

  const partsMove = new Array(move)
  partsMove.fill(MOVE)

  const partsRanged = new Array(ranged)
  partsRanged.fill(RANGED_ATTACK)

  const partsMelee = new Array(melee)
  partsMelee.fill(ATTACK)

  const partsHeal = new Array(heal)
  partsHeal.fill(HEAL)

  const body = partsTough.concat(partsMove).concat(partsRanged).concat(partsMelee).concat(partsHeal)

  this.__bodyCache[stepLimit] = body

  return body
}

// room service, melee strelok...
strelok.makeBody_2 = function (room, limit = undefined) {
  const energy = room.extendedAvailableEnergyCapacity()
  const pairs = Math.min(Math.floor(energy / 130), limit || 25)

  const partsMove = new Array(pairs)
  partsMove.fill(MOVE)

  const partsMelee = new Array(pairs)
  partsMelee.fill(ATTACK)

  const body = partsMove.concat(partsMelee)

  return body
}

// before profiler wrap
const patrol = _.assign({ }, strelok)

patrol.id = 'patrol'

const PatrolLimit = 5

patrol.makeBody = function (room) {
  return strelok.makeBody(room, PatrolLimit)
}

patrol.makeBody_2 = function (room) {
  return strelok.makeBody_2(room, PatrolLimit)
}

strelok.register()
patrol.register()

module.exports =
{
  strelok,
  patrol
}
