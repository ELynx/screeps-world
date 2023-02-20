'use strict'

const Process = require('./process.template')

const towerProcess = new Process('tower')

towerProcess.work = function (room) {
  if (!room.my) return

  this.debugHeader(room)

  const towers = room.find(
    FIND_STRUCTURES,
    {
      filter: function (structure) {
        return structure.structureType === STRUCTURE_TOWER && structure.isActiveSimple
      }
    }
  )

  if (towers.length === 0) return

  const creeps = room.find(FIND_CREEPS)

  const hostileCreeps = _.filter(
    creeps,
    function (creep) {
      return creep.hostile
    }
  )

  if (hostileCreeps.length > 0) {
    let harmful = _.filter(
      hostileCreeps,
      function (creep) {
        if (creep.directHarm || creep.sideHarm) return true

        // STRATEGY attack NPCs immediately, they have no complex tactics to reveal
        return !creep.pc
      }
    )

    // STRATEGY periodically attack at random
    if (harmful.length === 0 && (room.intl % 10 === 0)) {
      harmful = _.sample(hostileCreeps, towers.length)
    }

    if (harmful.length > 0) {
      // STRATEGY what targets to aim first
      harmful = _.sortByOrder(harmful, ['sideHarm', 'sideHarmPower', 'directHarm'], ['desc', 'desc', 'desc'])

      // step 1 - increase size to equal or greater than tower cound
      while (harmful.length < towers.length) {
        harmful = harmful.concat(harmful)
      }

      // step 2 - decrease size to fit the towers
      if (harmful.length > towers.length) {
        // side effect - left-most items have more copies on the list
        // so most harmful stuff will be attacked multiple times
        harmful = _.take(harmful, towers.length)
      }

      // TODO matrix solution?
      harmful = _.shuffle(harmful)

      for (let i = 0; i < towers.length; ++i) {
        const tower = towers[i]

        if (tower.__acted) continue

        const target = harmful[i]

        const rc = tower.attack(target)
        if (rc === OK) tower.__acted = true
      }
    }
  }

  const damagedCreeps = _.filter(
    creeps,
    function (creep) {
      // callous
      if (creep.memory && creep.memory.shel) return false

      return creep.myOrAlly() && (creep.hits < creep.hitsMax)
    }
  )

  if (damagedCreeps.length > 0) {
    for (let i = 0; i < towers.length; ++i) {
      const tower = towers[i]

      if (tower.__acted) continue

      const closestDamaged = tower.pos.findClosestByRange(damagedCreeps)
      if (closestDamaged) {
        const rc = tower.heal(closestDamaged)
        if (rc === OK) tower.__acted = true
      }
    }
  }
}

towerProcess.register()

module.exports = towerProcess
