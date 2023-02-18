'use strict'

const Process = require('./process.template')

const autobuildProcess = new Process('autobuild')

autobuildProcess.bestNeighbour = function (room, posOrRoomObject, weightFunction) {
  // cheap call
  const terrain = room.getTerrain()

  const center = posOrRoomObject.pos ? posOrRoomObject.pos : posOrRoomObject

  // 5x5
  const weights = new Array(25)
  weights.fill(0)
  for (let dx = -1; dx <= 1; ++dx) {
    for (let dy = -1; dy <= +1; ++dy) {
      // don't check center
      if (dx === 0 && dy === 0) { continue }

      const x = center.x + dx
      const y = center.y + dy

      const weight = weightFunction(x, y, dx, dy, terrain.get(x, y))

      // 7 is the middle of 2nd row
      const index = 7 + dx + (5 * (dy + 1))
      weights[index] = weight
    }
  }

  // for index `key` array of indexes that affect it's weight
  const Magic =
    {
      0: [6],
      1: [6, 7],
      2: [6, 8, 8],
      3: [7, 8],
      4: [8],
      5: [6, 11],
      9: [8, 13],
      10: [6, 11, 16],
      14: [8, 13, 18],
      15: [11, 16],
      19: [13, 18],
      20: [16],
      21: [16, 17],
      22: [16, 17, 18],
      23: [17, 18],
      24: [18]
    }

  // output of position and weight
  const positions = []

  for (const index in Magic) {
    // restore dx dy
    const dx = (index % 5) - 2
    const dy = Math.floor(index / 5) - 2

    // get the position
    const x = center.x + dx
    const y = center.y + dy

    // prevent out of bounds
    if (x <= 0 || x >= 49 || y <= 0 || y >= 49) {
      continue
    }

    const blocked = terrain.get(x, y) === TERRAIN_MASK_WALL

    if (blocked) continue // to next index

    const toVisits = Magic[index]
    for (let i = 0; i < toVisits.length; ++i) {
      const toVisit = toVisits[i]
      weights[index] += weights[toVisit]
    }

    positions.push(
      {
        pos: new RoomPosition(x, y, room.name),
        weight: weights[index]
      }
    )
  }

  positions.sort(
    function (item1, item2) {
      return item2.weight - item1.weight
    }
  )

  return positions
}

autobuildProcess.logConstructionSite = function (room, posOrRoomObject, structureType, rc) {
  const pos = posOrRoomObject.pos ? posOrRoomObject.pos : posOrRoomObject
  const message = 'Planned ' + structureType + ' at ' + pos + ' with result code ' + rc

  console.log(message)
  Game.notify(message, 30)
}

autobuildProcess.tryPlan = function (room, posOrRoomObject, structureType) {
  const sites = room.lookForAt(LOOK_CONSTRUCTION_SITES, posOrRoomObject)
  if (sites.length > 0) {
    return ERR_FULL
  }

  const structs = room.lookForAt(LOOK_STRUCTURES, posOrRoomObject)
  for (let i = 0; i < structs.length; ++i) {
    const struct = structs[i]
    if (struct.structureType === structureType) {
      return ERR_FULL
    }
  }

  const rc = room.createConstructionSite(posOrRoomObject, structureType)

  this.logConstructionSite(room, posOrRoomObject, structureType, rc)

  return rc
}

autobuildProcess.extractor = function (room) {
  if (CONTROLLER_STRUCTURES[STRUCTURE_EXTRACTOR][room.controller.level] > 0) {
    const minerals = room.find(FIND_MINERALS)
    for (let i = 0; i < minerals.length; ++i) {
      const mineral = minerals[i]
      this.tryPlan(room, mineral, STRUCTURE_EXTRACTOR)
    }
  }
}

// STRATEGY weight of goodness of place near the source
// return best position regardless of buildings and roads
// thus always should return same distribution for source
autobuildProcess.weightAroundTheSource = function (x, y, dx, dy, terrainMask) {
  // no harvester can stand on the endge, discourage
  if (x <= 0 || y <= 0 || x >= 49 || y >= 49) { return -10 }

  // check for walls, they get no bonuses
  if (terrainMask === TERRAIN_MASK_WALL) {
    // walls can be develop, but are expensive
    return 1
  }

  // plain and swamp are relatively equal to develop
  let result = 5

  // orthogonal positions give more advantage when roads are added
  if (dx === 0 || dy === 0) { result = result + 2 }

  // going more to the center
  if (x < 25 && dx > 0) { result = result + 1 }

  if (x > 25 && dx < 0) { result = result + 1 }

  if (y < 25 && dy > 0) { result = result + 1 }

  if (y > 25 && dy < 0) { result = result + 1 }

  return result
}

autobuildProcess.weightSource = function (room, source) {
  const terrain = room.getTerrain()
  const center = source.pos

  let result = 0
  for (let dx = -1; dx <= 1; ++dx) {
    for (let dy = -1; dy <= 1; ++dy) {
      if (dx === 0 && dy === 0) { continue }

      const x = center.x + dx
      const y = center.y + dy

      const weight = this.weightAroundTheSource(x, y, dx, dy, terrain.get(x, y))

      result += weight
    }
  }

  return result
}

// STRATEGY how many target links to have (reserved) at any given time
const TargetLinkReserve = 1

autobuildProcess.sourceLink = function (room) {
  const canHave = CONTROLLER_STRUCTURES[STRUCTURE_LINK][room.controller.level] || 0
  if (canHave === 0) return

  // out of two, reserve one, otherwise links will wait for whole level to complete
  const reserve = canHave <= 2 ? 1 : TargetLinkReserve

  if (canHave > reserve) {
    const filterForLinks = function (structure) {
      return structure.structureType === STRUCTURE_LINK && structure.isActiveSimple()
    }

    const links = room.find(
      FIND_STRUCTURES,
      {
        filter: filterForLinks
      }
    )

    const linksCS = room.find(
      FIND_CONSTRUCTION_SITES,
      {
        filter: { structureType: STRUCTURE_LINK }
      }
    )

    // if still have links to plan
    if (canHave > links.length + linksCS.length) {
      const sources = room.find(FIND_SOURCES)

      if (sources.length > 0) {
        // pick source with most access first
        sources.sort(
          _.bind(
            function (s1, s2) {
              const w1 = this.weightSource(room, s1)
              const w2 = this.weightSource(room, s2)

              return w2 - w1
            },
            this
          )
        )

        const weightFunction = _.bind(this.weightAroundTheSource, this)

        for (let i = 0; i < sources.length && i < canHave - reserve; ++i) {
          const source = sources[i]

          const positions = this.bestNeighbour(room, source, weightFunction)
          if (positions.length > 0) {
            // to avoid re-positioning, always pick best
            const at = positions[0]

            // only when not totally bad decision
            if (at.weight > 0) {
              // always think in like of "one souce - one link"
              this.tryPlan(room, at, STRUCTURE_LINK)
            }
          }
        } // end of sources
      } // end of have sources
    } // end of have links to build now
  } // end of have links in general
}

// STRATEGY how many containers to have (reserved) at any given time
const ContainerReserve = 0

autobuildProcess.sourceContainer = function (room) {
  const canHave = CONTROLLER_STRUCTURES[STRUCTURE_CONTAINER][room.controller.level] || 0
  if (canHave === 0) return

  if (canHave > ContainerReserve) {
    const filterForContainers = function (structure) {
      return structure.structureType === STRUCTURE_CONTAINER && structure.isActiveSimple()
    }

    const containers = room.find(
      FIND_STRUCTURES,
      {
        filter: filterForContainers
      }
    )

    const containersCS = room.find(
      FIND_CONSTRUCTION_SITES,
      {
        filter: { structureType: STRUCTURE_CONTAINER }
      }
    )

    // if still have links to plan
    if (canHave > containers.length + containersCS.length) {
      const sources = room.find(FIND_SOURCES)

      if (sources.length > 0) {
        // pick source with most access first
        sources.sort(
          _.bind(
            function (s1, s2) {
              const w1 = this.weightSource(room, s1)
              const w2 = this.weightSource(room, s2)

              return w2 - w1
            },
            this
          )
        )

        const terrain = room.getTerrain()

        for (let i = 0; i < sources.length && i < canHave - ContainerReserve; ++i) {
          const source = sources[i]

          const positions = []
          for (let dx = -1; dx <= 1; ++dx) {
            for (let dy = -1; dy <= 1; ++dy) {
              if (dx === 0 && dy === 0) continue

              const x = source.pos.x + dx
              const y = source.pos.y + dy

              const terrainMask = terrain.get(x, y)

              const weight = this.weightAroundTheSource(x, y, dx, dy, terrainMask)
              if (weight > 0) {
                positions.push(
                  {
                    pos: new RoomPosition(x, y, room.name),
                    weight
                  }
                )
              }
            }
          }

          positions.sort(
            function (item1, item2) {
              return item2.weight - item1.weight
            }
          )

          if (positions.length > 0) {
            // to avoid re-positioning, always pick best
            const at = positions[0]
            this.tryPlan(room, at, STRUCTURE_CONTAINER)
          }
        } // end of sources
      } // end of have sources
    } // end of have containers to build now
  } // end of have containers in general
}

autobuildProcess.coverRamparts = function (room) {
  const canHave = CONTROLLER_STRUCTURES[STRUCTURE_RAMPART][room.controller.level] || 0
  if (canHave === 0) return

  // this function has potential to create a lot of sites
  // as such, unfiy look for sites and locations here, not in generic planner
  const terrain = room.getTerrain()
  const constructionSites = room.lookForAtArea(LOOK_CONSTRUCTION_SITES, 0, 0, 49, 49)
  const structures = room.lookForAtArea(LOOK_STRUCTURES, 0, 0, 49, 49)

  // since call is TOP, LEFT, result is Y, then X...
  for (const ky in structures) {
    const atY = structures[ky]
    const csAtY = constructionSites[ky]

    for (const kx in atY) {
      // no ramparts on walls
      if (terrain.get(parseInt(kx), parseInt(ky)) === TERRAIN_MASK_WALL) {
        continue // to next y
      }

      if (csAtY) {
        const csAtXY = csAtY[kx]
        if (csAtXY) {
          continue // to next y
        }
      }

      const atXY = atY[kx]

      let onlyRoad = true
      let hasWall = false
      let hasRamp = false

      for (let i = 0; i < atXY.length; ++i) {
        const structure = atXY[i]

        if (structure.structureType !== STRUCTURE_ROAD) {
          onlyRoad = false
        }

        if (structure.structureType === STRUCTURE_WALL) {
          hasWall = true
          break
        }

        if (structure.structureType === STRUCTURE_RAMPART) {
          hasRamp = true
          break
        }
      }

      if (onlyRoad || hasRamp || hasWall) continue // to next y

      // terrain is not natural wall
      // there are no construction sites
      // there are structures other than road
      // there is no ramp
      // this presumably can be covered

      const pos = new RoomPosition(parseInt(kx), parseInt(ky), room.name)
      const rc = room.createConstructionSite(pos, STRUCTURE_RAMPART)
      this.logConstructionSite(room, pos, STRUCTURE_RAMPART, rc)
    }
  }
}

autobuildProcess.wallsAroundController = function (room) {
  const canHave = CONTROLLER_STRUCTURES[STRUCTURE_WALL][room.controller.level] || 0
  if (canHave === 0) return

  const terrain = room.getTerrain()

  for (let dx = -1; dx <= 1; ++dx) {
    for (let dy = -1; dy <= 1; ++dy) {
      if (dx === 0 && dy === 0) continue

      const x = room.controller.pos.x + dx
      const y = room.controller.pos.y + dy

      const terrainMask = terrain.get(x, y)

      if (terrainMask === TERRAIN_MASK_WALL) continue

      this.tryPlan(room, new RoomPosition(x, y, room.name), STRUCTURE_WALL)
    }
  }
}

autobuildProcess.actualWork = function (room) {
  this.wallsAroundController(room)
  this.extractor(room)
  this.sourceLink(room)
  this.sourceContainer(room)
  this.coverRamparts(room)
}

autobuildProcess.work = function (room) {
  this.debugHeader(room)

  let executeAutoBuild = false

  if (Game.flags.autobuild &&
      Game.flags.autobuild.room &&
      Game.flags.autobuild.room.name === room.name) {
    Game.flags.autobuild.remove()
    executeAutoBuild = true
  } else {
    // once in 6 creep generations
    if (room.memory.abld === undefined ||
        room.memory.abld < Game.time - (6 * CREEP_LIFE_TIME)) {
      executeAutoBuild = !(room.memory.abld === undefined)
    }
  }

  // let the flag clear
  if (!room.my) return

  if (executeAutoBuild) {
    // offset regeneration time randomly so multiple rooms don't do it at same tick
    room.memory.abld = Game.time + Math.ceil(Math.random() * 6 * CREEP_LIFE_TIME)

    const t0 = Game.cpu.getUsed()
    console.log('Autobuild for room ' + room.name + ' started at ' + t0)

    if (Object.keys(Game.constructionSites).length < 100) {
      this.actualWork(room)
    } else {
      console.log('100 or more construction sites, cannot plan more')
    }

    const t1 = Game.cpu.getUsed()
    console.log('Autobuild for room ' + room.name + ' finished at ' + t1 + ' and took ' + (t1 - t0))
  }
}

autobuildProcess.register()

module.exports = autobuildProcess
