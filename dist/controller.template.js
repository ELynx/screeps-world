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
  /**
    Unique identifier.
    **/
  this.id = id

  /**
    Range at which `act` can be used.
    **/
  this.actRange = 1

  /**
    Extra value stored to creep memory.
    **/
  this.extra = undefined

  /**
    Cache of target IDs that already have creep assigned.
    **/
  this._excludedTargets = undefined

  /**
    Detect if assigned targets are excluded
    **/
  this._creepPerTarget = false

  /**
    Clear room target cache.
    **/
  this._prepareExcludedTargets = function (room) {
    this._creepPerTarget = true
    this._excludedTargets = []
  }

  /**
    Cache the creep target.
    Duration - room.
    @param {Creep} creep.
    **/
  this._excludeTarget = function (creep) {
    this._excludedTargets.push(creep.memory.dest)
  }

  /**
    Filter targets by exclusion.
    @param {array<Object>} targets to filter.
    @return Targets that can be used.
    **/
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

  /**
    Prepare for new room.
    @param {Room} room.
    **/
  this.roomPrepare = function (room) {
    this._roomPrepare(room)
  }

  /**
    Observe creep that is already controlled.
    @param {Creep} creep.
    **/
  this.observeMyCreep = undefined

  /**
    Do something with target and creep then they met.
    @param {Object} target.
    @param {Creep} creep.
    @return Creep intent return code.
    **/
  this.act = undefined

  /**
    Targets within room.
    @param {Room} room.
    @return Found targets.
    **/
  this.targets = undefined

  /**
    Cache of targets per loop per room.
    **/
  this._targetCache = undefined

  /**
    Caching getter for targets.
    @param {Room} room.
    @return Possible targets.
    **/
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

  this._validateRestocker = function (target, creep) {
    // not a restocker, no special rules
    if (this._isNotRestocker(creep)) return true

    // stay stationary
    if (Math.abs(target.pos.x - creep.pos.x) > this.actRange) return false
    if (Math.abs(target.pos.y - creep.pos.y) > this.actRange) return false

    return true
  }

  /**
  Check if target is take-able.
  **/
  this.validateTarget = function (allTargets, target, creep) {
    return this._validateRestocker(target, creep)
  }

  this._allAssignedTo = function (target) {
    // in case when called, e.g. by flag
    if (target.room === undefined) return []

    const roomCreeps = target.room.getRoomControlledCreeps()
    return _.filter(
      roomCreeps,
      function (creep) {
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

  this._isRestocker = function (creep) {
    return creep.memory.rstk || false
  }

  this._isNotRestocker = function (creep) {
    return !this._isRestocker(creep)
  }

  this._isMiner = function (creep) {
    return creep.memory.minr || false
  }

  this._isRecyclee = function (creep) {
    return creep.memory.rccl || false
  }

  this._usesDefaultFilter = undefined

  /**
    Creep that has energy and can perform general work
    **/
  this._defaultFilter = function (creep) {
    this._usesDefaultFilter = true
    return this._isWorkAble(creep)
  }

  this._doesDefaultFilter = undefined

  /**
    Default implementation.
    **/
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

  /**
    @param {Room} room
    @param {array<Creep>} roomCreeps.
    @return Not assigned creeps.
    **/
  this.assignCreeps = function (room, roomCreeps) {
    const allTargets = this._findTargets(room)

    let remainingTargets = allTargets.slice(0)
    let unassignedCreeps = []

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
            continue
          }
        } // to next target

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

        // simulate single assignment logic on small scale
        if (this._creepPerTarget) {
          remainingTargets = _.filter(
            remainingTargets,
            function (someTarget) {
              return someTarget.id !== target.id
            }
          )
        }
      } else {
        unassignedCreeps.push(creep)
      }
    } // end of creeps loop

    return unassignedCreeps
  }

  /**
    Default implementation.
    @param {Room} room to control.
    @param {array<Creeps>} roomCreeps to control.
    **/
  this.control = function (room, roomCreeps) {
    if (!this.targets) {
      console.log('Controller ' + this.id + 'missing targets method')
      return roomCreeps
    }

    if (this._usesDefaultFilter) {
      if (room._isDefaultFiltered()) {
        return roomCreeps
      }
    }

    const creepMatch = []
    const creepSkip = []

    for (const creep of roomCreeps) {
      if (this.filterCreep(creep)) {
        creepMatch.push(creep)
      } else {
        creepSkip.push(creep)
      }
    }

    if (creepMatch.length === 0) {
      if (this._doesDefaultFilter) {
        room._markDefaultFiltered()
      }

      return roomCreeps
    }

    if (this._findTargets(room).length === 0) {
      return roomCreeps
    }

    // remainder returned
    const creepsUnused = this.assignCreeps(room, creepMatch)

    if (creepsUnused.length > 0) {
      return creepSkip.concat(creepsUnused)
    } else {
      if (this._doesDefaultFilter) {
        room._markDefaultFiltered()
      }

      return creepSkip
    }
  }

  this.wrapIntent = function (creep, intentName, arg0 = undefined, arg1 = undefined, arg2 = undefined) {
    return intentSolver.wrapCreepIntent(creep, intentName, arg0, arg1, arg2)
  }

  /**
    Register into bootstrap.
    **/
  this.register = function () {
    bootstrap.registerRoomController(this)

    if (profiler) {
      profiler.registerObject(this, this.id)
    }
  }
};

module.exports = Controller
