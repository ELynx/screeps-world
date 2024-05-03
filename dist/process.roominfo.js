'use strict'

const cookActor = require('./actor.cook')

const Process = require('./process.template')

const roomInfoProcess = new Process('roomInfo')

roomInfoProcess.sourceLevel = function (room) {
  const sources = room.find(FIND_SOURCES)
  return sources.length
}

roomInfoProcess.miningLevel = function (room) {
  if (room._my_) {
    if (room.extractor === undefined || room.extractor.isActiveSimple === false) return 0
    if (!cookActor.roomCanMine(room)) return 0
  } else {
    const extractors = room.find(
      FIND_STRUCTURES,
      {
        filter: structure => {
          return structure.structureType === STRUCTURE_EXTRACTOR && structure.isActiveSimple
        }
      }
    )

    if (extractors.length === 0) return 0
  }

  const minerals = room.find(
    FIND_MINERALS,
    {
      filter: mineral => {
        return mineral.mineralAmount > 0
      }
    }
  )

  if (minerals.length === 0) return 0

  return 1
}

roomInfoProcess._wallLevel = function (room) {
  const walls = room.find(
    FIND_STRUCTURES,
    {
      filter: structure => {
        return structure.structureType === STRUCTURE_WALL && structure.hits && structure.hitsMax
      }
    }
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

// STRATEGY wall build-up, basis levels
roomInfoProcess.wallLevel = function (room) {
  if (!room._my_) return 0

  const TargetBarrierHp = [
    0,
    5,
    10,
    15,
    20,
    25
  ]

  let level = room.level()
  if (level >= TargetBarrierHp.length) level = TargetBarrierHp.length - 1

  const targetByEnergyLevel = TargetBarrierHp[level]

  // walls can be inherited and force room into over-repair
  // control the wlvl to not increment in great steps

  const roomPlanned = room.memory.wlvl
  if (roomPlanned) {
    const roomHas = this._wallLevel(room)

    // if walls are under-level, build up from what is available
    if (roomHas < roomPlanned || roomHas < targetByEnergyLevel) return roomHas + 1

    // walls are equal or greater, may be significantly greater

    // grow if there is no danger
    if (room.memory.threat === undefined) {
      if (Math.random() < 1 / 6) {
        return roomPlanned + 1
      }
    }

    // no growth
    return roomPlanned
  } else {
    return targetByEnergyLevel
  }
}

roomInfoProcess.upgradeLevel = function (room) {
  if (!room._my_) return 0

  const MaxDistance = 3

  const links = _.filter(room.links, _.property('isActiveSimple'))
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
