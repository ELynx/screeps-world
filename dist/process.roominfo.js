'use strict'

const intentSolver = require('./routine.intent')
const bootstrap = require('./bootstrap')

const Process = require('./process.template')

const roomInfoProcess = new Process('roomInfo')

roomInfoProcess._walkable = function (terrain, position) {
  if (terrain.get(position.x, position.y) !== TERRAIN_MASK_WALL) {
    return true
  }

  const atPosition = position.lookFor(LOOK_STRUCTURES)
  for (const structure of atPosition) {
    if (structure.structureType === STRUCTURE_ROAD) {
      return true
    }
  }

  return false
}

roomInfoProcess.harvestLevel = function (room) {
  const terrain = room.getTerrain()
  const sources = room.find(FIND_SOURCES)

  const positions = { }
  for (const source of sources) {
    for (let dx = -1; dx <= 1; ++dx) {
      for (let dy = -1; dy <= 1; ++dy) {
        if (dx === 0 && dy === 0) continue

        const x = source.pos.x + dx
        const y = source.pos.y + dy

        if (x <= 0 || x >= 49 || y <= 0 || y >= 49) {
          continue
        }

        positions[(x + 1) + 100 * (y + 1)] = new RoomPosition(x, y, source.pos.roomName)
      }
    }
  }

  let walkable = 0
  for (const index in positions) {
    const position = positions[index]
    if (this._walkable(terrain, position)) {
      ++walkable
    }
  }

  return walkable
}

roomInfoProcess.sourceLevel = function (room) {
  const sources = room.find(FIND_SOURCES)
  return sources.length
}

/**
Calculate room mining level.
@param {Room} room.
@return Mining level of room.
**/
roomInfoProcess.miningLevel = function (room) {
  if (room._my_) {
    if (room.extractor === undefined || room.extractor.isActiveSimple === false) return 0
    if (room.storage === undefined && room.terminal === undefined) return 0
  } else {
    const extractors = room.find(
      FIND_STRUCTURES,
      {
        filter: function (structure) {
          return structure.structureType === STRUCTURE_EXTRACTOR && structure.isActiveSimple
        }
      }
    )

    if (extractors.length === 0) return 0
  }

  const minerals = room.find(
    FIND_MINERALS,
    {
      filter: function (mineral) {
        return mineral.mineralAmount > 0
      }
    }
  )

  if (minerals.length === 0) return 0

  // stop producing miners when there is no place to put resources
  if (room._my_) {
    let hasFreeSpace = false

    for (const mineral of minerals) {
      if (room.storage) {
        const stotageFree = intentSolver.getFreeCapacity(room.storage, mineral.mineralType)
        if (stotageFree > 0) {
          hasFreeSpace = true
          break
        }
      }

      if (room.terminal) {
        const terminalFree = intentSolver.getFreeCapacity(room.terminal, mineral.mineralType)
        if (terminalFree > 0)
        {
          hasFreeSpace = true
          break
        }
      }
    }

    if (!hasFreeSpace) return 0
  }

  return 1
}

roomInfoProcess._wallLevel = function (room) {
  const walls = room.find(
    FIND_STRUCTURES,
    {
      filter: function (structure) {
        return structure.structureType === STRUCTURE_WALL && structure.hits
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
    function (hits1, hits2) {
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

    room.memory.hlvl = this.harvestLevel(room)
    room.memory.slvl = this.sourceLevel(room)
    room.memory.mlvl = this.miningLevel(room)
    room.memory.wlvl = this.wallLevel(room)

    // offset regeneration time randomly so multiple rooms don't do it at same tick
    room.memory.intl = Game.time + Math.ceil(Math.random() * 42)
  }

  // STRATEGY how much energy to keep in storage as backup
  room.memory.stre = 10000

  // STRATEGY stored energy in store per threat level
  const threat = room.memory.threat
  if (threat) {
    if (threat === bootstrap.ThreatLevelMax) {
      room.memory.stre = 0
    } else if (threat >= bootstrap.ThreatLevelMedium) {
      room.memory.stre = 5000
    } else if (threat > bootstrap.ThreatLevelLow) {
      room.memory.stre = 9000
    }
  }

  // STRATEGY when there is no other way, use reserves
  if (room.extendedAvailableEnergyCapacity() === 0) {
    room.memory.stre = 0
  }
}

roomInfoProcess.register()

module.exports = roomInfoProcess
