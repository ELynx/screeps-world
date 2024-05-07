'use strict'

const bootstrap = require('./bootstrap')

const buildController = require('./controller.build')
const downgradeController = require('./controller.downgrade')
const grabController = require('./controller.grab')
const mineralHarvestController = require('./controller.mineral.harvest')
const rampupController = require('./controller.rampup')
const repairController = require('./controller.repair')
const sourceHarvestController = require('./controller.source.harvest')
const unliveController = require('./controller.unlive')
const upgradeController = require('./controller.upgrade')

const cook = require('./cook')

const autobuildProcess = require('./process.autobuild')
const roomInfoProcess = require('./process.roominfo')
const secutiryProcess = require('./process.security')
const spawnProcess = require('./process.spawn')
const towerProcess = require('./process.tower')

const mapUtils = require('./routine.map')

// all controllers that want to fill in creep storage
const controllersFreeCapacity = [
  grabController.id,
  mineralHarvestController.id,
  sourceHarvestController.generic.id,
  sourceHarvestController.specialist.id
]

// all controllers that will keep creep in place for more than one tick
const controllersBlockStop = [
  buildController.id,
  downgradeController.id,
  mineralHarvestController.id,
  rampupController.id,
  repairController.id,
  sourceHarvestController.generic.id,
  sourceHarvestController.specialist.id,
  upgradeController.generic.id,
  upgradeController.specialist.id
]

// STRATEGY priority for creep assignment
const controllersMyAuto = [
  downgradeController.id, // always on top
  cook.id, // trust in intelligence
  unliveController.id, // after demonstrated to cook, before takes other tasks
  mineralHarvestController.id, // narrow filter
  sourceHarvestController.specialist.id, // narrow filter
  rampupController.id,
  repairController.id,
  buildController.id,
  upgradeController.generic.id,
  sourceHarvestController.generic.id
]

const controllersRemoteHarvestAuto = [
  cook.id, // controls unload
  repairController.id,
  buildController.id,
  sourceHarvestController.specialist.id
]

const controllersHelpAuto = [
  cook.id, // controls energy withdraw for help
  rampupController.id,
  repairController.id,
  buildController.id
]

const controllersConsuming = [
  grabController.id
]

const roomActor =
{
  roomControllersFind: function (room) {
    if (room._actType_ === bootstrap.RoomActTypeMy) {
      return [controllersMyAuto, controllersConsuming]
    }

    if (room._actType_ === bootstrap.RoomActTypeRemoteHarvest) {
      return [controllersRemoteHarvestAuto, controllersConsuming]
    }

    if (room._actType_ === bootstrap.RoomActTypeHelp) {
      return [controllersHelpAuto, controllersConsuming]
    }

    return [[], []]
  },

  roomActType: function (room) {
    if (room._my_) {
      return bootstrap.RoomActTypeMy
    }

    if (room.myReserved() || room.sourceKeeper() || room.unowned) {
      return bootstrap.RoomActTypeRemoteHarvest
    }

    if (room.ally || room.neutral) {
      return bootstrap.RoomActTypeHelp
    }

    return 0
  },

  roomControllersPrepare: function (controllers, room) {
    for (const id of controllers) {
      const controller = bootstrap.roomControllers[id]
      if (controller && _.isFunction(controller.roomPrepare)) {
        controller.roomPrepare(room)
      }
    }
  },

  _roomControllerObserveOwn: function (controller, creep) {
    if (_.isFunction(controller.observeMyCreep)) {
      controller.observeMyCreep(creep)
    }
  },

  roomControllersObserveOwn: function (creep) {
    const controller = bootstrap.roomControllers[creep.memory.ctrl]
    if (controller) {
      this._roomControllerObserveOwn(controller, creep)
    }
  },

  roomControllersAct: function (target, creep) {
    const controller = bootstrap.roomControllers[creep.memory.ctrl]
    if (controller) {
      const rc = controller.act(target, creep)

      if (rc >= OK) {
        this._roomControllerObserveOwn(controller, creep)
      }

      return rc === OK
    }

    return false
  },

  roomControllersControl: function (controllers, room, creeps) {
    for (const id of controllers) {
      const controller = bootstrap.roomControllers[id]

      if (controller === undefined) {
        console.log('Unknown controller [' + id + ']')
        continue
      }

      const [creepsUnused, creepsUsed] = controller.control(room, creeps)

      if (_.some(controllersBlockStop, _.matches(id))) {
        for (const creep of creepsUsed) {
          creep.blockStop()
        }
      }

      // if all creeps had been taken
      if (creepsUnused.length === 0) {
        return []
      }

      creeps = creepsUnused
    }

    return creeps
  },

  consumingControllersControl: function (controllers, room, creep) {
    let didConsume = false
    let error = false
    let warning = false
    for (const id of controllers) {
      const controller = bootstrap.roomControllers[id]

      if (controller === undefined) {
        console.log('Unknown controller [' + id + ']')
        continue
      }

      if (controller.filterCreep(creep)) {
        const rc = controller.act(room, creep)

        if (rc >= OK) {
          this._roomControllerObserveOwn(controller, creep)
          didConsume = true
        }

        if (rc === bootstrap.ERR_INTENDEE_EXHAUSTED) {
          error = true
          break
        }

        if (rc === bootstrap.WARN_BOTH_EXHAUSED || rc === bootstrap.WARN_INTENDEE_EXHAUSTED) {
          warning = true
          break
        }
      }
    }

    if (!didConsume) return ERR_NOT_FOUND
    if (error) return bootstrap.ERR_INTENDEE_EXHAUSTED
    if (warning) return bootstrap.WARN_INTENDEE_EXHAUSTED
    return OK
  },

  act: function (room) {
    // mark initial time
    const t0 = Game.cpu.getUsed()

    room._actType_ = this.roomActType(room)

    // priority, triggers safe mode
    secutiryProcess.work(room)
    // misc constants that govern other stuff
    roomInfoProcess.work(room)
    // passive defense
    towerProcess.work(room)
    // set d&s before others act
    cook.work(room)

    // STRATEGY don't execute certain processes too often and on the same tick / all rooms
    const processKey = (room.memory.intl + Game.time) % 10

    if (processKey === 0 ||
        processKey === 5 ||
        room._threatEscalated_) {
      spawnProcess.work(room)
    }

    const roomCreeps = room.getRoomControlledCreeps()

    if (roomCreeps.length > 0) {
      const [roomControllers, consumingControllers] = this.roomControllersFind(room)

      // clean up controllers
      this.roomControllersPrepare(roomControllers, room)
      this.roomControllersPrepare(consumingControllers, room)

      // loop 1 - pre-act
      for (const creep of roomCreeps) {
        bootstrap.activeBodyParts(creep)

        // migrate creeps into room of registration
        if (creep.memory.crum !== creep.room.name) {
          creep.__roomActor_roomChange = true

          if (creep._move_ > 0) {
            const posInDestRoom = bootstrap.centerRoomPosition(creep.memory.crum)
            const rangeInDestRoom = posInDestRoom.offBorderDistance()

            creep.moveToWrapper(
              posInDestRoom,
              {
                range: rangeInDestRoom,
                reusePath: _.random(3, 5)
              }
            )
          }

          continue
        }

        // do pass-by chores that consume something into creep
        const consumingRc = this.consumingControllersControl(consumingControllers, room, creep)
        if (consumingRc >= OK) {
          if (_.some(controllersFreeCapacity, _.matches(creep.memory.ctrl))) {
            bootstrap.unassignCreep(creep)
          }
        }
      }

      // loop 2 - act and mark creeps that hold position
      for (const creep of roomCreeps) {
        if (creep.__roomActor_roomChange) continue

        if (bootstrap.creepAssigned(creep)) {
          creep.__roomActor_target = bootstrap.getObjectById(creep.memory.dest)

          if (creep.__roomActor_target) {
            if (creep.pos.inRangeTo(creep.__roomActor_target, creep.memory.dact)) {
              const keep = this.roomControllersAct(creep.__roomActor_target, creep)

              if (keep) {
                creep.__roomActor_atTarget = true
                creep.blockPosition()
              } else {
                creep.__roomActor_target = undefined
                bootstrap.unassignCreep(creep)
              }
            }
          }
        } else {
          // some creeps hog the spot in inactive state
          if (creep.memory.blok) {
            creep.blockPosition()
          }
        }
      }

      // loop 3 - movement within room
      for (const creep of roomCreeps) {
        if (creep.__roomActor_roomChange) continue
        if (creep.__roomActor_target === undefined) continue
        if (creep.__roomActor_atTarget) continue

        // state - there is a target not in range

        if (creep._move_ === 0) {
          creep.blockPosition()
          creep.__roomActor_target = undefined
          bootstrap.unassignCreep(creep)
          continue
        }

        if (creep.fatigue > 0) {
          creep.fatigueWrapper()
          // do not forget to let controller know there is an assignee
          this.roomControllersObserveOwn(creep)
          continue
        }

        // STRATEGY creep movement, main CPU sink

        let color = 'green'

        // first move by cached path
        let rc = creep.moveToWrapper(
          creep.__roomActor_target,
          {
            noPathFinding: true,
            reusePath: _.random(3, 5)
          }
        )

        // no movement, see if pathfinding is possible and within CPU
        if (rc === ERR_NOT_FOUND) {
          if (bootstrap.hardCpuUsed(t0) <= room._cpuLimit_) {
            color = 'yellow'
            rc = creep.moveToWrapper(
              creep.__roomActor_target,
              {
                costCallback: mapUtils.costCallback_costMatrixForRoomActivity,
                ignoreCreeps: false, // if original path has to be re-made, be aware
                maxRooms: 1,
                range: creep.memory.dact,
                rememberStop: true,
                reusePath: _.random(3, 5)
              }
            )
          } else {
            // keep assignment
            color = 'red'
            rc = OK
          }
        }

        if (rc === OK) {
          if (_.some(controllersBlockStop, _.matches(creep.memory.ctrl))) {
            creep.blockStop()
          }
          this.roomControllersObserveOwn(creep)
        } else {
          color = 'purple'
          creep.__roomActor_target = undefined
          bootstrap.unassignCreep(creep)
        }

        const circleOptions = { stroke: color, fill: color, radius: 0.15 }
        room.visual.circle(creep.pos.x, creep.pos.y, circleOptions)
        if (creep._next_pos_) {
          room.visual.circle(creep._next_pos_.x, creep._next_pos_.y, circleOptions)
        }
        if (creep._move_path_) {
          room.visual.poly(creep._move_path_, { stroke: color })
        }
      }

      const unassignedCreeps = _.filter(
        roomCreeps,
        creep => {
          if (creep.__roomActor_target) return false

          // plunders with empty cargo will be taken away
          if (creep.shortcut === 'plunder' && downgradeController._isEmpty(creep)) {
            return false
          }

          return true
        }
      )

      if (unassignedCreeps.length > 0) {
        const standing = this.roomControllersControl(roomControllers, room, unassignedCreeps)
        for (const creep of standing) {
          creep.blockPosition()
        }

        // move unassigned creeps off the border
        // relevant for plunders
        for (const creep of unassignedCreeps) {
          const pos = creep.pos

          if (pos.x === 0) creep.moveWrapper(RIGHT)
          else if (pos.x === 49) creep.moveWrapper(LEFT)
          else if (pos.y === 0) creep.moveWrapper(BOTTOM)
          else if (pos.y === 49) creep.moveWrapper(TOP)
        }
      }
    }

    if (bootstrap.hardCpuUsed(t0) <= room._cpuLimit_) {
      autobuildProcess.work(room)
    }
  } // end of act method
}

module.exports = roomActor
