'use strict'

let profiler

if (Game.flags.profiler) {
  profiler = require('./screeps-profiler')
}

const bootstrap = require('./bootstrap')

const mapUtils = require('./routine.map')
const intentSolver = require('./routine.intent')

Room.prototype._markDefaultFiltered = function () {
  this.__controllerTemplate_markDefaultFiltered = true
}

Room.prototype._isDefaultFiltered = function () {
  return this.__controllerTemplate_markDefaultFiltered || false
}

function Controller (id) {
  this.id = id

  this.actRange = 1

  this.extra = undefined

  this._creepPerTarget = false

  this._excludedTargets = undefined

  this._prepareExcludedTargets = function (room) {
    this._creepPerTarget = true
    this._excludedTargets = []
  }

  this._excludeTarget = function (creep) {
    this._excludedTargets.push(creep.memory.dest)
  }

  this._filterExcludedTargets = function (targets) {
    if (targets.length === 0 || this._excludedTargets.length === 0) {
      return targets
    }

    const targetIds = _.map(targets, 'id')
    const exclude = _.intersection(targetIds, this._excludedTargets)

    if (targets.length === exclude.length) {
      return []
    }

    return _.filter(targets,
      target => {
        return !_.some(exclude, _.matches(target.id))
      }
    )
  }

  this._roomPrepare = function (room) {
    this.__controllerTemplate_targetCache = undefined
  }

  this.roomPrepare = function (room) {
    this._roomPrepare(room)
  }

  this.observeMyCreep = undefined

  this.act = undefined

  this.targets = undefined

  this.__controllerTemplate_targetCache = undefined

  this._findTargets = function (room) {
    if (this.__controllerTemplate_targetCache) {
      return this.__controllerTemplate_targetCache
    }

    let targets = this.targets(room)

    if (this._excludedTargets) {
      targets = this._filterExcludedTargets(targets)
    }

    this.__controllerTemplate_targetCache = targets

    return targets
  }

  this._isStationarySpecialist = function (creep) {
    if (this._isHarvester(creep)) return true
    if (this._isUpgrader(creep)) return true

    return false
  }

  this._isAtDestination = function (creep) {
    return creep.memory.atds || false
  }

  this._isTargetWithinRange = function (target, creep, range) {
    if (Math.abs(target.pos.x - creep.pos.x) > range) return false
    if (Math.abs(target.pos.y - creep.pos.y) > range) return false

    return true
  }

  this._isTargetWithinActingRange = function (target, creep) {
    return this._isTargetWithinRange(target, creep, this.actRange)
  }

  this._validateTarget = function (allTargets, target, creep) {
    if (this._isStationarySpecialist(creep) && this._isAtDestination(creep)) {
      return this._isTargetWithinActingRange(target, creep)
    }

    return true
  }

  this.validateTarget = function (allTargets, target, creep) {
    return this._validateTarget(allTargets, target, creep)
  }

  this._hasWCM = function (creep) {
    bootstrap.activeBodyParts(creep)
    return creep._work_ > 0 && creep._carry_ > 0 && creep._move_ > 0
  }

  this._hasEnergy = function (creep) {
    return intentSolver.getUsedCapacity(creep, RESOURCE_ENERGY) > 0
  }

  this._isEmpty = function (creep) {
    return intentSolver.getUsedCapacity(creep) === 0
  }

  this._hasFreeCapacity = function (creep) {
    return intentSolver.getFreeCapacity(creep) > 0
  }

  this._isWorkAble = function (creep) {
    return this._hasWCM(creep) && this._hasEnergy(creep)
  }

  this._isHarvester = function (creep) {
    return creep.memory.hvst || false
  }

  this._isNotHarvester = function (creep) {
    return !this._isHarvester(creep)
  }

  this._isMiner = function (creep) {
    return creep.memory.minr || false
  }

  this._isUpgrader = function (creep) {
    return creep.memory.upgr || false
  }

  this._isNotUpgrader = function (creep) {
    return !this._isUpgrader(creep)
  }

  this._isRecyclee = function (creep) {
    return creep.memory.rccl || false
  }

  this._usesDefaultFilter = undefined

  this._defaultFilter = function (creep) {
    this._usesDefaultFilter = true
    return this._isWorkAble(creep)
  }

  this._doesDefaultFilter = undefined

  this.filterCreep = function (creep) {
    this._doesDefaultFilter = true
    return this._defaultFilter(creep)
  }

  this._manhattanDistanceCost = function (creep, target) {
    return creep.pos.manhattanDistance(target.pos)
  }

  /**
    COST of creep working on target.
    Lower is better, higher is worse.
    **/
  this.creepToTargetCost = function (creep, target) {
    return this._manhattanDistanceCost(creep, target)
  }

  this._creepToTargetsAscendingSort = function (creep, targets) {
    for (const target of targets) {
      target.__controllerTemplate_cost = this.creepToTargetCost(creep, target)
    }

    targets.sort(
      (t1, t2) => {
        return t1.__controllerTemplate_cost - t2.__controllerTemplate_cost
      }
    )
  }

  this.assignCreeps = function (room, roomCreeps) {
    const allTargets = this._findTargets(room)

    let remainingTargets = allTargets.slice(0)

    let unassignedCreeps = []
    const assignedCreeps = []

    for (let i = 0; i < roomCreeps.length; ++i) {
      if (remainingTargets.length === 0) {
        // don't forget creeps that are not tested at all
        const creepsLeft = roomCreeps.slice(i)

        if (unassignedCreeps.length === 0) {
          unassignedCreeps = creepsLeft
        } else {
          unassignedCreeps = unassignedCreeps.concat(creepsLeft)
        }

        break // from creeps cycle
      }

      const creep = roomCreeps[i]

      // to avoid re-sorting array
      const targets = remainingTargets.slice(0)

      // sort targets in order of increased effort
      this._creepToTargetsAscendingSort(creep, targets)

      let susTarget
      let susPath
      let susPathLength

      let target
      let path
      let pathLength

      let pathCache

      for (const currentTarget of targets) {
        // more expensive check that sort
        // see if assignment breaks some specific creep-target
        if (_.isFunction(this.validateTarget)) {
          if (this.validateTarget(allTargets, currentTarget, creep) === false) {
            continue // to next target
          }
        }

        let usedPathCache = false

        if (creep.pos.inRangeTo(currentTarget.pos, this.actRange)) {
          target = currentTarget
        } else {
          let solution

          // see if path can be reused
          if (pathCache && pathCache.length > 0) {
            const last = _.last(pathCache)
            // see if path brings creep to act range of
            if (currentTarget.pos.inRangeTo(last.x, last.y, this.actRange)) {
              solution = pathCache
              usedPathCache = true
            }
          }

          if (solution === undefined) {
            solution = room.findPath(
              creep.pos,
              currentTarget.pos,
              bootstrap.moveOptionsWrapper(
                creep,
                {
                  costCallback: mapUtils.costCallback_costMatrixForRoomActivity,
                  ignoreCreeps: true,
                  maxRooms: 1,
                  range: this.actRange
                }
              )
            )
          }

          if (solution.length > 0) {
            const last = _.last(solution)
            const found = currentTarget.pos.inRangeTo(last.x, last.y, this.actRange)
            if (found) {
              // a lot of targets are clustered together
              pathCache = solution

              // STRATEGY coefficient to reconsider target
              const RethinkCoefficient = 2
              // check case when manhattan is very close but walk is very long
              const maxAcceptableSolutionLength = this._manhattanDistanceCost(creep, currentTarget) * RethinkCoefficient

              // if suspicion is triggered
              if (solution.length > maxAcceptableSolutionLength) {
                // keep information about first target
                if (susTarget === undefined) {
                  susTarget = currentTarget
                  susPath = solution
                  susPathLength = solution.length
                }
              } else {
                target = currentTarget
                path = solution
                pathLength = solution.length
              }
            }
          }
        }

        // normal target was found
        if (target) {
          break // out of target loop
        }

        // sus target check caused a recalculation
        if (susTarget && susTarget.id !== currentTarget.id && !usedPathCache) {
          break // out of target loop
        }
      } // end of target loop

      // check for sus

      if (target === undefined && susTarget !== undefined) {
        // nothing better than sus was found
        target = susTarget
        path = susPath
      } else if (pathLength !== undefined && susPathLength !== undefined) {
        // there are competing sus and non-sus targets
        if (pathLength >= susPathLength) {
          // if actual movement to target is not shorter than more priority earlier
          target = susTarget
          path = susPath
        }
      }

      if (target) {
        let extra

        if (_.isFunction(this.extra)) {
          extra = this.extra(target)
        } else if (_.isObject(this.extra)) {
          extra = this.extra
        }

        bootstrap.assignCreep(this, target, path, creep, extra)
        assignedCreeps.push(creep)

        const circleOptions = { stroke: 'white', fill: 'white', radius: 0.15 }
        room.visual.circle(creep.pos.x, creep.pos.y, circleOptions)
        room.visual.circle(target.pos.x, target.pos.y, circleOptions)
        if (path) {
          room.visual.poly(path, { stroke: 'white' })
        }

        // simulate single assignment logic on small scale
        if (this._creepPerTarget) {
          remainingTargets = _.filter(
            remainingTargets,
            someTarget => {
              return someTarget.id !== target.id
            }
          )
        }
      } else {
        unassignedCreeps.push(creep)
      }
    } // end of creeps loop

    return [unassignedCreeps, assignedCreeps]
  }

  this.control = function (room, allCreeps) {
    if (this._usesDefaultFilter) {
      if (room._isDefaultFiltered()) {
        return [allCreeps, []]
      }
    }

    const compatibleCreeps = []
    const incompatibleCreeps = []

    for (const creep of allCreeps) {
      if (this.filterCreep(creep)) {
        compatibleCreeps.push(creep)
      } else {
        incompatibleCreeps.push(creep)
      }
    }

    if (compatibleCreeps.length === 0) {
      if (this._doesDefaultFilter) {
        room._markDefaultFiltered()
      }

      return [allCreeps, []]
    }

    if (this._findTargets(room).length === 0) {
      return [allCreeps, []]
    }

    const [unassignedCreeps, assignedCreeps] = this.assignCreeps(room, compatibleCreeps)

    if (unassignedCreeps.length > 0) {
      return [incompatibleCreeps.concat(unassignedCreeps), assignedCreeps]
    } else {
      if (this._doesDefaultFilter) {
        room._markDefaultFiltered()
      }

      return [incompatibleCreeps, assignedCreeps]
    }
  }

  this.wrapIntent = function (creep, intentName, arg0 = undefined, arg1 = undefined, arg2 = undefined) {
    return intentSolver.wrapCreepIntent(creep, intentName, arg0, arg1, arg2)
  }

  this.register = function () {
    bootstrap.registerRoomController(this)

    if (profiler) {
      profiler.registerObject(this, this.id)
    }
  }
}

module.exports = Controller
