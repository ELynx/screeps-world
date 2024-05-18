'use strict'

const bootstrap = require('./bootstrap')

const intentSolver = require('./routine.intent')

// STRATEGY CPU reservation strategy
const PostCPUTarget = Game.cpu.limit - 0.5

const cookActor =
{
  ___prepareDeltaMap: function (something) {
    if (something.__cook__deltaMap === undefined) {
      something.__cook__deltaMap = new Map()
    }
  },

  __adjustPlannedDelta: function (something, resourceType, delta) {
    this.___prepareDeltaMap(something)
    const now = something.__cook__deltaMap.get(resourceType) || 0
    something.__cook__deltaMap.set(resourceType, now + delta)
  },

  ___plannedDelta: function (something, resourceType) {
    if (something.__cook__deltaMap) {
      return something.__cook__deltaMap.get(resourceType) || 0
    }

    return 0
  },

  ___supply: function (structure, resourceType) {
    // TODO
    return structure.store.getUsedCapacity(resourceType)
  },

  ___demand: function (structure, resourceType) {
    // TODO
    return structure.store.getFreeCapacity(resourceType)
  },

  __labClusterDemand: function (labsIterator, resourceType) {
    // TODO
    return false
  },

  _hasDemand: function (structure, resourceType) {
    return this.___demand(structure, resourceType) > 0
  },

  _labClusterHasDemand: function (labsIterator, resourceType) {
    return this.__labClusterDemand(labsIterator, resourceType) > 0
  },

  __plannedUsedCapacity: function (something, resourceType) {
    const actualAndIntents = intentSolver.getUsedCapacity(something, resourceType)
    const planned = this.___plannedDelta(something, resourceType)

    return actualAndIntents + planned
  },

  __plannedFreeCapacity: function (something, resourceType) {
    const actualAndIntents = intentSolver.getFreeCapacity(something, resourceType)
    const planned = this.___plannedDelta(something, resourceType)

    return actualAndIntents + planned
  },

  _reserveFromStructureToCreep: function (structure, creep, resourceType) {
    const freeSpace = intentSolver.getFreeCapacity(creep, resourceType)
    if (freeSpace <= 0) return

    this.__adjustPlannedDelta(structure, resourceType, -1 * freeSpace)
  },

  _expectFromCreepToStructure: function (structure, creep) {
    for (const resourceType in creep.store) {
      const usedSpace = intentSolver.getUsedCapacity(creep, resourceType)
      if (usedSpace <= 0) continue

      this.__adjustPlannedDelta(structure, resourceType, usedSpace)
    }
  },

  __withdrawFromStructureToCreep: function (structure, creep, resourceType) {
    const canTake = creep.store.getFreeCapacity(resourceType)
    if (canTake <= 0) return ERR_FULL

    const wantGive = this.___supply(structure, resourceType)
    if (wantGive <= 0) return ERR_NOT_ENOUGH_RESOURCES

    const amount = Math.min(canTake, wantGive)

    return intentSolver.wrapCreepIntent(creep, 'withdraw', structure, resourceType, amount)
  },

  _controllerWithdrawFromStructureToCreep: function (structure, creep, resourceType) {
    const rc = this.__withdrawFromStructureToCreep(structure, creep, resourceType)
    // to avoid observe calls
    if (rc >= OK) return bootstrap.ERR_TERMINATED

    return rc
  },

  __transferFromCreepToStructure: function (structure, creep, resourceType) {
      const canGive = intentSolver.getUsedCapacity(creep, resourceType)
      if (canGive <= 0) return ERR_NOT_ENOUGH_RESOURCES

      const wantTake = this.___demand(structure, resourceType)
      if (wantTake <= 0) return ERR_FULL

      const amount = Math.min(canGive, wantTake)

      return intentSolver.wrapCreepIntent(creep, 'transfer', structure, resourceType, amount)
  },

  _controllerTransferFromCreepToStructure: function (structure, creep) {
    for (const resourceType in creep.store) {
      const rc = this.__transferFromCreepToStructure(structure, creep, resourceType)
      // to avoid observe calls
      if (rc >= OK) return bootstrap.ERR_TERMINATED
    }

    return ERR_NOT_ENOUGH_RESOURCES
  },

  // << imitate controller
  id: 'cook',

  actRange: 1,

  roomPrepare: function (room) {
    room.__cook__pass = 0
  },

  observeMyCreep: function (creep) {
    const structure = bootstrap.getObjectById(creep.memory.dest)
    if (!structure) return

    if (creep.memory.xtra) {
      this._reserveFromStructureToCreep(structure, creep, creep.memory.xtra)
    } else {
      this._expectFromCreepToStructure(structure, creep)
    }
  },

  act: function (structure, creep) {
    if (creep.memory.xtra) {
      return this._controllerWithdrawFromStructureToCreep(structure, creep, creep.memory.xtra)
    } else {
      return this._controllerTransferFromCreepToStructure(structure, creep)
    }
  },

  _controlPass1: function (room, creeps) {
    // TODO
    return [creeps, []]
  },

  _controlPass2: function (room, creeps) {
    // TODO
    return [creeps, []]
  },

  control: function (room, creeps) {
    ++room.__cook__pass

    if (room.__cook__pass === 1) return this._controlPass1(room, creeps)
    if (room.__cook__pass === 2) return this._controlPass2(room, creeps)

    console.log('Unexpected call to cook::control for room [' + room.name + '] with pass [' + room.__cook__pass + ']')
    return [creeps, []]
  },
  // >>

  roomCanHandle: function (room, resourceType) {
    if (resourceType === RESOURCE_ENERGY) return true

    if (!room._my_) return false

    if (room.__cook__roomCanHandle === undefined) {
      room.__cook__roomCanHandle = new Map()
    }

    const cached = room.__cook__roomCanHandle.get(resourceType)
    if (cached !== undefined) return cached

    const withCache = (x, key, value) => {
      x.__cook__roomCanHandle.set(key, value)
      return value
    }

    // in order of likelihood of having space for random resource

    // has space for "stuff"
    if (room.terminal) {
      if (this._hasDemand(room.terminal, resourceType)) return withCache(room, resourceType, true)
    }

    // for reagents lost in transport
    if (this._labClusterHasDemand(room.labs.values(), resourceType)) return withCache(room, resourceType, true)

    // for ghodium lost in transport
    if (room.nuker) {
      if (this._hasDemand(room.nuker, resourceType)) return withCache(room, resourceType, true)
    }

    // for "shiny" things only
    if (room.storage) {
      if (this._hasDemand(room.storage, resourceType)) return withCache(room, resourceType, true)
    }

    // for power lost in transport
    if (room.powerSpawn) {
      if (this._hasDemand(room.powerSpawn, resourceType)) return withCache(room, resourceType, true)
    }

    // if somehow packed resources of interest
    if (room.factory) {
      if (this._hasDemand(room.factory, resourceType)) return withCache(room, resourceType, true)
    }

    return withCache(room, resourceType, false)
  },

  roomCanMine: function (room) {
    if (!room._my_) {
      console.log('Unexpected call to cook::roomCanMine for room [' + room.name + '] => false')
      return false
    }

    // STRATEGY no mining if no terminal
    if (room.terminal === undefined) return false

    const mineralType = room.mineralType()
    if (mineralType === '') return false

    return this._hasDemand(room.terminal, mineralType) || this._labClusterHasDemand(room.labs.values(), mineralType)
  },

  _operateHarvesters: function (room) {
    const roomCreeps = room.getRoomControlledCreeps()

    const harvesters = _.filter(
      roomCreeps,
      creep => {
        if (creep._source_harvest_specialist_rc_ === OK) return false
        if (creep._source_ === undefined) return false
        if (creep.memory.atds !== true) return false
        if (creep.memory.btyp !== 'harvester') return false
        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) <= 0) return false

        return true
      }
    )

    if (harvesters.length === 0) return

    const containers = room.find(
      FIND_STRUCTURES,
      {
        filter: structure => {
          return structure.structureType === STRUCTURE_CONTAINER
        }
      }
    )

    const links = Array.from(room.links.values())

    if (containers.length === 0 && links.length === 0) return

    const notMaxHits = structure => structure.hits < structure.hitsMax

    const terrain = new Room.Terrain(room.name)
    const calculateHarvestSpot = (some1, some2) => {
      const dx = some2.pos.x - some1.pos.x
      const dy = some2.pos.y - some1.pos.y
      const absDx = Math.abs(dx)
      const absDy = Math.abs(dy)
      const evenDx = absDx % 2 === 0
      const evenDy = absDy % 2 === 0

      if (evenDx && evenDy) {
        return new RoomPosition(some1.pos.x + (dx / 2), some1.pos.y + (dy / 2), room.name)
      }

      if (evenDx) {
        const x = some1.pos + (dx / 2)
        const y1 = some1.pos.y
        const y2 = some2.pos.y

        if (terrain.get(x, y1) !== TERRAIN_MASK_WALL) {
          return new RoomPosition(x, y1, room.name)
        }

        if (terrain.get(x, y2) !== TERRAIN_MASK_WALL) {
          return new RoomPosition(x, y2, room.name)
        }
      }

      if (evenDy) {
        const y = some1.pos + (dy / 2)
        const x1 = some1.pos.x
        const x2 = some2.pos.x

        if (terrain.get(x1, y) !== TERRAIN_MASK_WALL) {
          return new RoomPosition(x1, y, room.name)
        }

        if (terrain.get(x2, y) !== TERRAIN_MASK_WALL) {
          return new RoomPosition(x2, y, room.name)
        }
      }

      return undefined
    }

    for (const harvester in harvesters) {
      const clusterContainers = _.filter(containers, container => container.isNearTo(harvester._source_))
      if (_.some(clusterContainers, notMaxHits)) continue

      const clusterLinks = _.filter(links, link => link.pos.manhattanDistance(harvester._source_.pos) === 2)
      if (_.some(clusterLinks, notMaxHits)) continue

      if (clusterContainers.length === 0 && clusterLinks.length === 0) continue

      // placement
      let harvestSpot

      if (harvester.memory.sptx !== undefined && harvester.memory.spty !== undefined) {
        harvestSpot = new RoomPosition(harvester.memory.sptx, harvester.memory.spty, room.name)
      }

      if (harvestSpot === undefined && clusterLinks.length > 0) {
        if (clusterLinks.length > 1) {
          clusterLinks = _.sortBy(clusterLinks, 'id')
        }

        const link = clusterLinks[0]
        harvestSpot = calculateHarvestSpot(harvester._source_, link)
      }

      if (harvestSpot === undefined && clusterContainers.length > 0) {
        clusterContainers = _.sortByAll(
          clusterContainers,
          container => {
            const absDx = Math.abs(container.pos.x - harvester._source_.pos.x)
            const absDy = Math.abs(container.pos.y - harvester._source_.pos.y)
            return absDx + absDy
          },
          'id'
        )

        harvestSpot = clusterContainers[0].pos
      }

      if (harvestSpot) {
        harvester.memory.sptx = harvestSpot.x
        harvester.memory.spty = harvestSpot.y

        if (harvestSpot.x !== harvester.pos.x || harvestSpot.y !== harvester.pos.y) {
          const direction = harvester.pos.getDirectionTo(harvestSpot)
          creep.moveWrapper(direction, { jiggle: true })
        }
      }

      let transferred = false
      for (const link of clusterLinks) {
        const rc = this.__transferFromCreepToStructure(link, harvester, RESOURCE_ENERGY)
        if (rc >= OK) {
          transferred = true
          break // from links loop
        }
      }

      if (!transferred) {
        for (const container of clusterContainers) {
          const rc = this.__transferFromCreepToStructure(container, harvester, RESOURCE_ENERGY)
          if (rc >= OK) {
            transferred = true
            break // from containers loop
          }
        }
      }
    }
  },

  _operateLinks: function (room) {
    // TODO
  },

  _operateLabs: function (room) {
    const inputLabs = []
    const outputLabs = []

    for (const lab of room.labs.values()) {
      if (lab.resourceType() === '') {
        outputLabs.push(lab)
      } else {
        inputLabs.push(lab)
      }
    }

    if (inputLabs.length < 2) return
    if (inputLabs.length > 2) {
      console.log('Unexpected number of input labs in room [' + room.name + ']. Found [' + inputLabs.length + '] input labs')
      return
    }

    // detect when no reaction possible
    for (const lab of inputLabs) {
      if (lab.mineralType === undefined) return
      if (lab.store.getUsedCapacity(lab.mineralType) <= 0) return
    }

    // STRATEGY how much labs can fire at the same tick by default
    const cookedMax = room.memory.cook || 1
    let cooked = 0
    for (const lab of outputLabs) {
      if (lab.cooldown && lab.cooldown > 0) continue

      if (lab.mineralType) {
        if (lab.store.getFreeCapacity(lab.mineralType) <= 0) continue
      }

      const rc = lab.runReaction(inputLabs[0], inputLabs[1])
      if (rc >= OK) ++cooked

      if (cooked >= cookedMax) return
    }
  },

  // called from room actor after controllers
  roomPost: function (room) {
    this._operateHarvesters(room)
    this._operateLinks(room)
    this._operateLabs(room)
  },

  _outOfCpu: function () {
    return Game.cpu.getUsed() >= PostCPUTarget
  },

  _performTerminalExchange: function () {
    // TODO
  },

  __operatePowerSpawn: function (powerSpawn) {
    if (powerSpawn.store.getUsedCapacity(RESOURCE_POWER) >= 1 &&
        powerSpawn.store.getUsedCapacity(RESOURCE_ENERGY) >= 50) {
      return powerSpawn.processPower()
    }

    return ERR_NOT_ENOUGH_RESOURCES
  },

  _operatePowerSpawns: function () {
    for (const powerSpawn of Game.powerSpawns.values()) {
      if (this._outOfCpu()) break
      this.__operatePowerSpawn(powerSpawn)
    }
  },

  __operateFactory: function (factory) {
    if (factory.cooldown && factory.cooldown > 0) {
      return ERR_TIRED
    }

    // fast check to cover any recepies
    if (factory.store.getUsedCapacity() <= 0) {
      return ERR_NOT_ENOUGH_RESOURCES
    }

    if (factory.store.getFreeCapacity() <= 0) {
      return ERR_FULL
    }

    if (factory.store.getUsedCapacity(RESOURCE_GHODIUM_MELT) >= 100 &&
        factory.store.getUsedCapacity(RESOURCE_ENERGY) >= 200) {
      return factory.produce(RESOURCE_GHODIUM)
    }

    if (factory.store.getUsedCapacity(RESOURCE_BATTERY) >= 50) {
      return factory.produce(RESOURCE_ENERGY)
    }

    return ERR_NOT_ENOUGH_RESOURCES
  },

  _operateFactories: function () {
    for (const factory of Game.factories.values()) {
      if (this._outOfCpu()) break
      this.__operateFactory(factory)
    }
  },

  __sellTerminalExcess: function (terminal) {
    // TODO
  },

  _sellTerminalsExcess: function () {
    for (const terminal of Game.terminals.values()) {
      if (this._outOfCpu()) break
      this.__sellTerminalExcess(terminal)
    }
  },

  // called from main after other actors
  globalPost: function () {
    if (this._outOfCpu()) return

    this._performTerminalExchange()
    this._operatePowerSpawns()
    this._operateFactories()
    this._sellTerminalsExcess()
  }
}

bootstrap.registerRoomController(cookActor)

module.exports = cookActor
