'use strict'

const Controller = require('./controller.template')

const buildController = new Controller('build')

buildController.actRange = 3

buildController.oddOrEven = 0

buildController.ally = true
buildController.neutral = buildController.ally
buildController.unowned = buildController.ally

buildController.act = function (site, creep) {
  return this.wrapIntent(creep, 'build', site)
}

// STRATEGY build priorities
buildController._sites = function (room) {
  const allSites = room.find(FIND_CONSTRUCTION_SITES)
  if (allSites.length === 0) return []

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

  const roomOwner = (room.controller && room.controller.owner) ? room.controller.owner.username : undefined
  const roomSafeMode = room.controller && room.controller.safeMode

  const allCreeps = room.find(FIND_CREEPS)
  let obstacleCreeps
  if (roomSafeMode) {
    obstacleCreeps = _.filter(allCreeps, _.matchesProperty('owner.username', roomOwner))
  } else {
    obstacleCreeps = allCreeps
  }

  return _.filter(
    sites,
    function (site) {
      if (!_.some(OBSTACLE_OBJECT_TYPES, site.structureType)) {
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
