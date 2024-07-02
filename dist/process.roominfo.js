'use strict'

const cook = require('./cook')

const Process = require('./process.template')

const roomInfoProcess = new Process('roomInfo')

roomInfoProcess.sourceLevel = function (room) {
  const sources = room.find(FIND_SOURCES)

  const sourcesInForseableFuture = _.filter(
    sources,
    source => {
      if (source.energy > 0) return true
      if (source.ticksToRegeneration < CREEP_LIFE_TIME) return true
      return false
    }
  )

  return sourcesInForseableFuture.length
}

roomInfoProcess.miningLevel = function (room) {
  if (room._my_) {
    if (room.extractor === undefined || room.extractor.isActiveSimple === false) return 0
    if (!cook.roomCanMine(room)) return 0
  } else {
    const structures = room.find(FIND_STRUCTURES)
    const extractors = _.filter(
      structures,
      structure => structure.structureType === STRUCTURE_EXTRACTOR && structure.isActiveSimple
    )

    if (extractors.length === 0) return 0
  }

  const minerals = _.filter(
    room.find(FIND_MINERALS),
    mineral => mineral.mineralAmount > 0
  )

  if (minerals.length === 0) return 0

  return 1
}

roomInfoProcess._wallLevel = function (room) {
  const structures = room.find(FIND_STRUCTURES)
  const walls = _.filter(
    structures,
    structure => structure.structureType === STRUCTURE_WALL && structure.hits && structure.hitsMax
  )

  if (walls.length === 0) {
    return 0
  }

  // fill in array of wall hits
  const hits = []
  for (const wall of walls) {
    hits.push(Math.floor(wall.hits / 1000))
  }

  hits.sort(
    (hits1, hits2) => {
      return hits1 - hits2
    }
  )

  return hits[Math.floor(hits.length / 2)]
}

const TargetBarrierHp = [
  0, // 0
  5, // 1
  10, // 2
  15, // 3
  20, // 4
  25, // 5
  30, // 6
  1000, // 7
  3000, // 8
  66600 // special
]

// STRATEGY wall build-up, basis levels
// walls can be inherited and force room into over-repair
// control the wlvl to not increment in great steps
roomInfoProcess.wallLevel = function (room) {
  if (!room._my_) return 0

  let wallupFlag = Game.flags['wallup_' + room.name]

  const baseLevel = room.level()
  const boostLevel = baseLevel + (wallupFlag === undefined ? 0 : 1)

  const targetByEnergyLevel = TargetBarrierHp[boostLevel]

  const roomPlanned = room.memory.wlvl
  if (roomPlanned) {
    const roomHas = this._wallLevel(room)

    // build walls all the way
    if (boostLevel > 8 && roomHas >= targetByEnergyLevel && wallupFlag) {
      // mark as inactive
      wallupFlag._removed_ = wallupFlag.remove() === OK
      wallupFlag = undefined
      // continue as usual
    }

    // if walls are under-level, build up from what is available
    if (roomHas < roomPlanned || roomHas < targetByEnergyLevel) {
      if (wallupFlag) {
        return roomHas + TargetBarrierHp[5]
      } else {
        return roomHas + TargetBarrierHp[1]
      }
    }

    // walls are equal or greater, may be significantly greater

    // grow if there is no danger
    if (room.memory.threat === undefined) {
      if (Math.random() < 1 / 6) {
        return roomPlanned + TargetBarrierHp[1]
      }
    }

    // no growth
    return roomPlanned
  } else {
    // don't force super high values from the start
    return TargetBarrierHp[baseLevel]
  }
}

roomInfoProcess.upgradeLevel = function (room) {
  if (!room._my_) return 0

  if (room.level() < 8) return 0

  const MaxDistance = 3

  const links = _.filter(Array.from(room.links.values()), _.property('isActiveSimple'))
  const linksWithinActRange = _.filter(
    links,
    link => {
      if (Math.abs(link.pos.x - room.controller.pos.x) > MaxDistance) return false
      if (Math.abs(link.pos.y - room.controller.pos.y) > MaxDistance) return false

      return true
    }
  )

  if (linksWithinActRange.length === 0) return 0

  return 1
}

roomInfoProcess.work = function (room) {
  room.memory.nodeAccessed = Game.time

  const force = Game.flags.recount && Game.flags.recount.pos.roomName === room.name

  // once in a creep life update room info
  if (force ||
      room.memory.intl === undefined ||
      room.memory.intl < Game.time - CREEP_LIFE_TIME) {
    if (force) {
      Game.flags.recount.remove()
    }

    if (Game._war_ && !force) {
      return
    }

    room.memory.slvl = this.sourceLevel(room)
    room.memory.mlvl = this.miningLevel(room)
    room.memory.wlvl = this.wallLevel(room)
    room.memory.ulvl = this.upgradeLevel(room)

    // offset regeneration time randomly so multiple rooms don't do it at same tick
    room.memory.intl = Game.time + Math.ceil(Math.random() * 42)
  }
}

roomInfoProcess.register()

module.exports = roomInfoProcess
