'use strict'

const profiler = require('./screeps-profiler')

const bootstrap = require('./bootstrap')

const mapUtils = require('./routine.map')
const intentSolver = require('./routine.intent')

Room.prototype._markDefaultFiltered = function () {
  this.__markDefaultFiltered = true
}

Room.prototype._isDefaultFiltered = function () {
  return this.__markDefaultFiltered || false
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
    Flag to execute target search with interleave.
    **/
  this.oddOrEven = undefined

  // flags to set where controller is used
  this.my = true
  this.myReserved = false
  this.ally = false
  this.neutral = false
  this.hostile = false
  this.sourceKeeper = false
  this.unowned = false

  this.compatible = function (room) {
    if (this.my && room.my) return true
    if (this.myReserved && room.myReserved()) return true
    if (this.ally && room.ally) return true
    if (this.neutral && room.neutral) return true
    if (this.hostile && room.hostile) return true
    if (this.sourceKeeper && room.sourceKeeper()) return true
    if (this.unowned && room.unowned) return true

    return false
  }

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
    this.__targetCache = undefined
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
    if (this.__targetCache) {
      return this.__targetCache
    }

    let targets = this.targets(room)

    if (this._excludedTargets) {
      targets = this._filterExcludedTargets(targets)
    }

    this.__targetCache = targets

    return targets
  }

  /**
    Check if target is take-able.
    **/
  this.validateTarget = undefined

  this._allAssignedTo = function (target) {
    const roomCreeps = target.room.getRoomControlledCreeps()
    return _.filter(
      roomCreeps,
      function (creep) {
        return creep.memory.ctrl === this.id && creep.memory.dest === target.id
      },
      this
    )
  }

  this._usesDefaultFilter = undefined

  this._hasCM = function (creep) {
    return creep.getActiveBodyparts(CARRY) > 0 &&
           creep.getActiveBodyparts(MOVE) > 0
  }

  this._hasWCM = function (creep) {
    return this._hasCM(creep) && creep.getActiveBodyparts(WORK) > 0
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

  /**
    Creep that has energy and can perform general work
    @param {Creep} creep to look at.
    @return If creep matches filter.
    **/
  this._defaultFilter = function (creep) {
    this._usesDefaultFilter = true

    return this._isWorkAble(creep)
  }

  this._doesDefaultFilter = undefined

  /**
    Default implementation.
    @param {Creep} creep to look at.
    @return If creep can be used.
    **/
  this.filterCreep = function (creep) {
    this._doesDefaultFilter = true

    return this._defaultFilter(creep)
  }

  this._manhattanDistanceCost = function (target, creep) {
    return target.pos.manhattanDistance(creep.pos)
  }

  /**
    COST of creep working on target.
    Lower is better, higher is worse.
    **/
  this.creepToTargetCost = function (target, creep) {
    return this._manhattanDistanceCost(target, creep)
  }

  this._targetToCreepSort = function (creep, t1, t2) {
    const cost1 = this.creepToTargetCost(t1, creep)
    const cost2 = this.creepToTargetCost(t2, creep)

    return cost1 - cost2
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
      targets.sort(
        _.bind(
          function (t1, t2) {
            return this._targetToCreepSort(creep, t1, t2)
          },
          this
        )
      )

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
                maxRooms: 1,
                range: this.actRange
              }
            )
          )

          if (solution.length > 0) {
            const last = solution[solution.length - 1]
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

    if (this.oddOrEven) {
      if ((room.memory.intl + Game.time) % 2 !== this.oddOrEven) {
        return roomCreeps
      }
    }

    if (this._usesDefaultFilter) {
      if (room._isDefaultFiltered()) {
        return roomCreeps
      }
    }

    if (this._findTargets(room).length === 0) {
      return roomCreeps
    }

    let creepMatch = []
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

    // remainder returned
    creepMatch = this.assignCreeps(room, creepMatch)

    if (creepMatch.length > 0) {
      return creepSkip.concat(creepMatch)
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
    profiler.registerObject(this, this.id)
  }
};

module.exports = Controller
