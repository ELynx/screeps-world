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
      function (target) {
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

  this._isTargetWithinRange = function (target, creep, range) {
    if (Math.abs(target.pos.x - creep.pos.x) > range) return false
    if (Math.abs(target.pos.y - creep.pos.y) > range) return false

    return true
  }

  this._isTargetWithinActingRange = function (target, creep) {
    return this._isTargetWithinRange(target, creep, this.actRange)
  }

  this._validateTarget = function (allTargets, target, creep) {
    if (this._isStationarySpecialist(creep)) {
      return this._isTargetWithinActingRange(target, creep)
    }

    return true
  }

  this.validateTarget = function (allTargets, target, creep) {
    return this._validateTarget(allTargets, target, creep)
  }

  this._allAssignedTo = function (target) {
    // in case when called, e.g. by flag
    if (target.room === undefined) return []

    const roomCreeps = target.room.getRoomControlledCreeps()
    return _.filter(
      roomCreeps,
      creep => {
        // check target in general
        if (target.id !== creep.memory.dest) return false
        // check this controller
        if (this.id === creep.memory.ctrl) return true

        return false
      },
      this
    )
  }

  this._hasCM = function (creep) {
    bootstrap.activeBodyParts(creep)
    return creep._carry_ > 0 && creep._move_ > 0
  }

  this._hasWCM = function (creep) {
    bootstrap.activeBodyParts(creep)
    return creep._work_ > 0 && creep._carry_ > 0 && creep._move_ > 0
  }

  this._hasEnergy = function (creep) {
    return intentSolver.getUsedCapacity(creep, RESOURCE_ENERGY) > 0
  }

  this._hasNonEnergy = function (creep) {
    return intentSolver.getUsedCapacity(creep) > intentSolver.getUsedCapacity(creep, RESOURCE_ENERGY)
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

  this._isHarvestAble = function (creep) {
    // STRATEGY harvest with empty only, reduce runs to sources
    return this._hasWCM(creep) && this._isEmpty(creep)
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
      function (t1, t2) {
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

      let target
      let path

      for (const currentTarget of targets) {
        // more expensive check that sort
        // see if assignment breaks some specific creep-target
        if (this.validateTarget) {
          if (this.validateTarget(allTargets, currentTarget, creep) === false) {
            continue // to next target
          }
        }

        if (creep.pos.inRangeTo(currentTarget.pos, this.actRange)) {
          target = currentTarget
        } else {
          const solution = room.findPath(
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

          if (solution.length > 0) {
            const last = _.last(solution)
            const found = currentTarget.pos.inRangeTo(last.x, last.y, this.actRange)
            if (found) {
              target = currentTarget
              path = solution
            }
          }
        }

        if (target) {
          break // out of target loop
        }
      } // end of target loop

      if (target) {
        let extra

        if (_.isFunction(this.extra)) {
          extra = this.extra(target)
        } else if (_.isObject(this.extra)) {
          extra = this.extra
        }

        bootstrap.assignCreep(this, target, path, creep, extra)
        assignedCreeps.push(creep)

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
