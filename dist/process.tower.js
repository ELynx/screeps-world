'use strict'

const Process = require('./process.template')

const towerProcess = new Process('tower')

towerProcess.work = function (room) {
  if (!room._my_) return

  const towers = []
  for (const tower of room.towers.values()) {
    if (!tower.isActiveSimple) continue
    if (tower.store.getUsedCapacity(RESOURCE_ENERGY) >= TOWER_ENERGY_COST) {
      towers.push(tower)
    }
  }

  if (towers.length === 0) return

  const creeps = room.find(FIND_CREEPS)

  const hostileCreeps = _.filter(
    creeps,
    creep => creep.hostile && creep.ticksToLive > (room.controller.safeMode || 1)
  )

  if (hostileCreeps.length > 0) {
    let harmful = _.filter(
      hostileCreeps,
      creep => {
        if (creep.pc) {
          // STRATEGY don't attack pc border jumpers
          const x = creep.pos.x
          if (x === 0 || x === 49) return false
          const y = creep.pos.y
          if (y === 0 || y === 49) return false
        }

        return true
      }
    )

    // STRATEGY laser focus towers on single healer at a time

    const healers = []
    for (const creep of harmful) {
      for (const bodyPart of creep.body) {
        if (bodyPart.type === HEAL) {
          healers.push(creep)
          break // from body part loop
        }
      }
    }

    healers.sort((a, b) => a.id.localeCompare(b.id))

    if (healers.length > 0) {
      harmful = [healers[0]]
    }

    // STRATEGY periodically attack at random
    const pewpew = room.memory.intl + Game.time
    if (harmful.length === 0 && (pewpew % 10 === 0)) {
      harmful = _.sample(hostileCreeps, towers.length)
    }

    if (harmful.length > 0) {
      // step 1 - increase size to equal or greater than tower count
      while (harmful.length < towers.length) {
        harmful = harmful.concat(harmful)
      }

      // step 2 - decrease size to fit the towers
      if (harmful.length > towers.length) {
        // side effect - left-most items have more copies on the list
        // so most harmful stuff will be attacked multiple times
        harmful = _.take(harmful, towers.length)
      }

      harmful = _.shuffle(harmful)

      for (let i = 0; i < towers.length; ++i) {
        const tower = towers[i]

        if (tower.__towerProcess_acted) continue

        const target = harmful[i]

        const rc = tower.attack(target)
        if (rc === OK) tower.__towerProcess_acted = true
      }
    }
  }

  const damagedCreeps = _.filter(
    creeps,
    creep => {
      // do not heal ones with self-heal
      if (creep.memory && creep.memory.shel) return false

      return creep.myOrAlly() && (creep.hits < creep.hitsMax)
    }
  )

  if (damagedCreeps.length > 0) {
    for (const tower of towers) {
      if (tower.__towerProcess_acted) continue

      const closestDamaged = tower.pos.findClosestByRange(damagedCreeps)
      if (closestDamaged) {
        const rc = tower.heal(closestDamaged)
        if (rc === OK) tower.__towerProcess_acted = true
      }
    }
  }
}

towerProcess.register()

module.exports = towerProcess
