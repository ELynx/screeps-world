'use strict'

const Process = require('./process.template')

const towerProcess = new Process('tower')

towerProcess.work = function (room) {
  if (!room._my_) return

  const towers = _.filter(Array.from(room.towers.values()), _.property('isActiveSimple'))

  if (towers.length === 0) return

  const creeps = room.find(FIND_CREEPS)

  const hostileCreeps = _.filter(
    creeps,
    creep => creep.hostile
  )

  if (hostileCreeps.length > 0) {
    let harmful = _.filter(
      hostileCreeps,
      creep => {
        if (creep.ticksToLive <= 1) return false

        if (creep.directHarm || creep.sideHarm) return true

        // STRATEGY attack NPCs immediately, they have no complex tactics to reveal
        return !creep.pc
      }
    )

    // STRATEGY periodically attack at random
    const pewpew = room.memory.intl + Game.time
    if (harmful.length === 0 && (pewpew % 10 === 0)) {
      harmful = _.sample(hostileCreeps, towers.length)
    }

    if (harmful.length > 0) {
      // assign zeros into empty slots
      for (const x of harmful) {
        x.sideHarm = x.sideHarm || 0
        x.sideHarmPower = x.sideHarmPower || 0
        x.directHarm = x.directHarm || 0
      }

      // STRATEGY what targets to aim first
      harmful = _.sortByOrder(harmful, ['sideHarm', 'sideHarmPower', 'directHarm'], ['desc', 'desc', 'desc'])

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

      // TODO? matrix solution
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
