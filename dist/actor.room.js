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
const energyUnspecialistController = require('./controller.energy.unspecialist')
const grabController = require('./controller.grab')
const mineralHarvestController = require('./controller.mineral.harvest')
const mineralRestockController = require('./controller.mineral.restock')
const rampupController = require('./controller.rampup')
const repairController = require('./controller.repair')
const unliveController = require('./controller.unlive')
const upgradeController = require('./controller.upgrade')
const upgradeSpecialistController = require('./controller.upgrade.specialist')

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
  upgradeController.id,
  upgradeSpecialistController.id
]

// STRATEGY priority for creep assignment

const controllersMyAuto = [
  downgradeController.id, // always on top
  unliveController.id, // catch recyclees
  mineralHarvestController.id, // catch miners to mineral
  mineralRestockController.full.id, // catch anyone with mineral only
  energySpecialistController.id, // catch restockers to
  energyUnspecialistController.id, // catch restockers from, if fell through
  energyTakeController.id, // above harvest, decrease harvest work
  energyHarvestController.id,
  energyRestockController.id,
  rampupController.id,
  repairController.id,
  buildController.id,
  upgradeSpecialistController.id, // when all work is done, start with heawy upgrader
  upgradeController.id,
  mineralRestockController.dump.id
]

const controllersRemoteHarvestAuto = [
  repairController.id,
  buildController.id,
  energySpecialistController.id,
  energyUnspecialistController.id
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
    if (room.__actType === bootstrap.RoomActTypeMy) {
      return [controllersMyAuto, controllersConsuming]
    }

    if (room.__actType === bootstrap.RoomActTypeRemoteHarvest) {
      return [controllersRemoteHarvestAuto, controllersConsuming]
    }

    if (room.__actType === bootstrap.RoomActTypeHelp) {
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

      creeps = controller.control(room, creeps)

      // if all creeps had been taken
      if (creeps.length === 0) {
        return []
      }
    }

    return creeps
  },

  consumingControllersControl: function (controllers, room, creep) {
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
        }

        if (rc === bootstrap.WARN_BOTH_EXHAUSED ||
            rc === bootstrap.WARN_INTENDEE_EXHAUSTED ||
            rc === bootstrap.ERR_INTENDEE_EXHAUSTED) {
          return rc
        }
      }
    }

    return OK
  },

  act: function (room) {
    // mark initial time
    const t0 = Game.cpu.getUsed()

    room.__actType = this.roomActType(room)
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
        room.__threatEscalated) {
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
        // migrate creeps into room of registration
        if (creep.memory.crum !== creep.room.name) {
          creep.__roomChange = true

          if (creep.getActiveBodyparts(MOVE) > 0) {
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
        if (consumingRc !== OK) {
          if (_.some(controllersFreeCapacity, _.matches(creep.memory.ctrl))) {
            bootstrap.unassignCreep(creep)
          }
        }
      }

      // loop 2 - act and mark creeps that hold position
      for (const creep of roomCreeps) {
        if (creep.__roomChange) continue

        if (bootstrap.creepAssigned(creep)) {
          creep.__target = creep.target()

          if (creep.__target) {
            if (creep.pos.inRangeTo(creep.__target, creep.memory.dact)) {
              const keep = this.roomControllersAct(creep.__target, creep)

              if (keep) {
                creep.__atTarget = true
                creep.blockPosition()
              } else {
                creep.__target = undefined
                bootstrap.unassignCreep(creep)
              }
            }
          }
        }
      }

      // loop 3 - movement within room
      for (const creep of roomCreeps) {
        if (creep.__roomChange) continue
        if (creep.__target === undefined) continue
        if (creep.__atTarget) continue

        // state - there is a target not in range

        if (creep.getActiveBodyparts(MOVE) === 0) {
          creep.blockPosition()
          creep.__target = undefined
          bootstrap.unassignCreep(creep)
          continue
        }

        if (creep.fatigue > 0) {
          creep.fatigueWrapper()
          continue
        }

        // STRATEGY creep movement, main CPU sink

        let stroke = 'green'

        // first move by cached path
        let rc = creep.moveToWrapper(
          creep.__target,
          {
            noPathFinding: true,
            reusePath: _.random(3, 5)
          }
        )

        // no movement, see if pathfinding is possible and within CPU
        if (rc === ERR_NOT_FOUND) {
          if (bootstrap.hardCpuUsed(t0) <= room.__cpuLimit) {
            stroke = 'yellow'
            rc = creep.moveToWrapper(
              creep.__target,
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
            stroke = 'red'
            rc = OK
          }
        }

        if (rc === OK) {
          if (_.some(controllersBlockStop, _.matches(creep.memory.ctrl))) {
            creep.blockStop()
          }
          this.roomControllersObserveOwn(creep)
        } else {
          stroke = 'purple'
          creep.__target = undefined
          bootstrap.unassignCreep(creep)
        }

        room.visual.circle(creep.pos.x, creep.pos.y, { fill: 'transparent', radius: 0.55, stroke })
      }

      const unassignedCreeps = _.filter(
        roomCreeps,
        function (creep) {
          if (creep.__target) return false

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

    if (bootstrap.hardCpuUsed(t0) <= room.__cpuLimit) {
      autobuildProcess.work(room)
    }

    if (processKey === 9 && bootstrap.hardCpuUsed(t0) <= room.__cpuLimit) {
      terminalProcess.work(room)
    }
  } // end of act method
}

module.exports = roomActor
