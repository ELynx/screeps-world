'use strict'

const bootstrap = require('./bootstrap')

const Process = require('./process.template')

const roomInfoProcess = new Process('roomInfo')

roomInfoProcess._walkable = function (terrain, position) {
  if (terrain.get(position.x, position.y) !== TERRAIN_MASK_WALL) {
    return true
  }

  const atPosition = position.lookFor(LOOK_STRUCTURES)
  for (const k in atPosition) {
    const struct = atPosition[k]
    if (struct.structureType === STRUCTURE_ROAD) {
      return true
    }
  }

  return false
}

roomInfoProcess.harvestLevel = function (room) {
  const terrain = room.getTerrain()
  const sources = room.find(FIND_SOURCES)

  const positions = { }
  for (let i = 0; i < sources.length; ++i) {
    const source = sources[i]

    for (let dx = -1; dx <= 1; ++dx) {
      for (let dy = -1; dy <= 1; ++dy) {
        if (dx === 0 && dy === 0) {
          continue
        }

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

/**
Calculate room source level.
@param {Room} room.
@return Source level of room.
**/
roomInfoProcess.sourceLevel = function (room) {
  const allStructures = room.find(
    FIND_STRUCTURES,
    {
      filter: function (structure) {
        return structure.isActiveSimple
      }
    }
  )

  const containers = _.filter(
    allStructures,
    function (structure) {
      return structure.structureType === STRUCTURE_CONTAINER && structure.isSource()
    }
  )

  let total = containers.length

  if (!room.my) {
    return total
  }

  const links = _.filter(
    allStructures,
    function (structure) {
      return structure.structureType === STRUCTURE_LINK
    }
  )

  let hasExchange = false
  if (links.length > 1) {
    for (let i = 0; i < links.length; ++i) {
      const link = links[i]
      if (!link.isSource()) {
        hasExchange = true
        break
      }
    }
  }

  if (!hasExchange) {
    return total
  }

  const consideredPositions = { }

  for (const index in containers) {
    const container = containers[index]
    const p = container.pos
    consideredPositions[(p.x + 1) + 100 * (p.y + 1)] = p
  }

  const terrain = room.getTerrain()
  const sources = room.find(FIND_SOURCES)

  for (let i = 0; i < links.length; ++i) {
    const link = links[i]
    if (link.isSource()) {
      let notFound = true
      for (let j = 0; j < sources.length && notFound; ++j) {
        const source = sources[j]
        const betweenTwo = link.pos.findSharedAdjacentPositions(source.pos)
        for (let k = 0; k < betweenTwo.length && notFound; ++k) {
          const p = betweenTwo[k]
          const index = (p.x + 1) + 100 * (p.y + 1)

          // to next between position
          if (consideredPositions[index]) continue
          if (!this._walkable(terrain, p)) continue

          consideredPositions[index] = p
          notFound = false
        }
      }
      if (notFound === false) ++total
    }
  }

  return total
}

/**
Calculate room mining level.
@param {Room} room.
@return Mining level of room.
**/
roomInfoProcess.miningLevel = function (room) {
  if (room.my) {
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
  for (let i = 0; i < walls.length; ++i) {
    hits.push(Math.floor(walls[i].hits / 1000))
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
  this.debugHeader(room)

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

  // STRATEGY how much energy to keep in bigger structures by default
  room.memory.trme = 300
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
}

roomInfoProcess.register()

module.exports = roomInfoProcess
