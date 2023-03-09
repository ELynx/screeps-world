'use strict'

const bootstrap = require('./bootstrap')

const Controller = require('./controller.template')

const buildController = new Controller('build')

buildController.actRange = 3

buildController.act = function (site, creep) {
  const rc = this.wrapIntent(creep, 'build', site)

  // this is last build, there is more energy in creep
  if (rc === bootstrap.WARN_INTENDED_EXHAUSTED) {
    // STRATEGY keep in place for ramp-up
    if (site.structureType === STRUCTURE_WALL || site.structureType === STRUCTURE_RAMPART) {
      return OK
    }
  }

  return rc
}

// STRATEGY build priorities
buildController._sites = function (room) {
  const allSites = room.find(FIND_CONSTRUCTION_SITES)
  if (allSites.length === 0) return []

  // STRATEGY in own rooms remove foreigh construction sites
  // presume that by level 2 of controller this was executed sufficient number of times
  if (room.my && room.controller && room.controller.level < 2) {
    let skipBeat = false

    for (const site of allSites) {
      if (Game.iff.ownUsername && Game.iff.ownUsername !== site.owner.username) {
        site.remove()
        skipBeat = true
      }
    }

    if (skipBeat) return []
  }

  const spawns = _.filter(
    allSites,
    {
      structureType: STRUCTURE_SPAWN
    }
  )
  if (spawns.length > 0) return spawns

  const extensions = _.filter(
    allSites,
    {
      structureType: STRUCTURE_EXTENSION
    }
  )
  if (extensions.length > 0) return extensions

  return allSites
}

buildController.targets = function (room) {
  const sites = this._sites(room)
  if (sites.length === 0) return []

  const allCreeps = room.find(FIND_CREEPS)
  let obstacleCreeps

  const roomSafeMode = room.controller && room.controller.safeMode
  if (roomSafeMode) {
    const roomOwner = (room.controller && room.controller.owner) ? room.controller.owner.username : undefined
    obstacleCreeps = _.filter(allCreeps, _.matchesProperty('owner.username', roomOwner))
  } else {
    obstacleCreeps = allCreeps
  }

  return _.filter(
    sites,
    function (site) {
      if (!_.some(OBSTACLE_OBJECT_TYPES, _.matches(site.structureType))) {
        return true
      }

      return !_.some(
        obstacleCreeps,
        function (creep) {
          return creep.pos.x === site.pos.x && creep.pos.y === site.pos.y
        }
      )
    }
  )
}

buildController.register()

module.exports = buildController
