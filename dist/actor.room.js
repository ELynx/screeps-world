'use strict'

const bootstrap = require('./bootstrap')

const mapUtils = require('./routine.map')

const autobuildProcess = require('./process.autobuild')
const linkProcess = require('./process.link')
const roomInfoProcess = require('./process.roominfo')
const secutiryProcess = require('./process.security')
const spawnProcess = require('./process.spawn')
const terminalProcess = require('./process.terminal')
const towerProcess = require('./process.tower')

const buildController = require('./controller.build')
const downgradeController = require('./controller.downgrade')
const energyHarvestController = require('./controller.energy.harvest')
const energyRestockController = require('./controller.energy.restock')
const energySpecialistController = require('./controller.energy.specialist')
const energyTakeController = require('./controller.energy.take')
const grabController = require('./controller.grab')
const mineralHarvestController = require('./controller.mineral.harvest')
const mineralRestockController = require('./controller.mineral.restock')
const rampupController = require('./controller.rampup')
const repairController = require('./controller.repair')
const unliveController = require('./controller.unlive')
const upgradeController = require('./controller.upgrade')

// all controllers that want to fill in creep storage
const controllersFreeCapacity = [
  energyHarvestController.id,
  energySpecialistController.id,
  energyTakeController.id,
  grabController.id,
  mineralHarvestController.id
]

// all controllers that will keep creep in place for more than one tick
const controllersBlockStop = [
  buildController.id,
  downgradeController.id,
  energyHarvestController.id,
  energySpecialistController.id,
  mineralHarvestController.id,
  rampupController.id,
  repairController.id,
  upgradeController.id
]

// STRATEGY priority for creep assignment

const controllersMyAuto = [
  downgradeController.id, // always on top
  unliveController.id, // catch recyclees
  mineralHarvestController.id, // catch miners to mineral
  mineralRestockController.full.id, // catch anyone with mineral only
  energySpecialistController.id, // catch restockers
  energyTakeController.id, // above harvest, decrease harvest work
  energyHarvestController.id,
  energyRestockController.id,
  rampupController.id,
  repairController.id,
  buildController.id,
  upgradeController.id,
  mineralRestockController.dump.id
]

const controllersRemoteHarvestAuto = [
  repairController.id,
  buildController.id,
  energySpecialistController.id
]

const controllersHelpAuto = [
  energyTakeController.id,
  energyRestockController.id,
  rampupController.id,
  repairController.id,
  buildController.id
]

const controllersConsuming = [
  grabController.id
]

Creep.prototype.target = function () {
  return bootstrap.getObjectById(this.memory.dest)
}

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
    const [roomControllers, consumingControllers] = this.roomControllersFind(room)

    if (roomControllers.length === 0 && consumingControllers.length === 0) {
      console.log('No controllers found for room [' + room.name + ']')
      return
    }

    secutiryProcess.work(room)
    roomInfoProcess.work(room)
    towerProcess.work(room)

    // STRATEGY don't execute certain processes too often and on the same tick / all rooms
    const processKey = (room.memory.intl + Game.time) % 12

    if (processKey === 0 ||
        processKey === 6 ||
        room._threatEscalated_) {
      spawnProcess.work(room)
    }

    if (processKey === 3) {
      linkProcess.work(room)
    }

    const roomCreeps = room.getRoomControlledCreeps()

    if (roomCreeps.length > 0) {
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
          creep.__roomActor_target = creep.target()

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
        function (creep) {
          if (creep.__roomActor_target) return false

          // plunders with empty cargo will be taken away
          if (creep.shortcut === 'plunder' && upgradeController._isEmpty(creep)) {
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

    if (processKey === 9 && bootstrap.hardCpuUsed(t0) <= room._cpuLimit_) {
      terminalProcess.work(room)
    }
  } // end of act method
}

module.exports = roomActor
