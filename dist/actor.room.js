'use strict'

const bootstrap = require('./bootstrap')

const mapUtils = require('./routine.map')

const autobuildProcess = require('./process.autobuild')
const linkProcess = require('./process.link')
const roomInfoProcess = require('./process.roominfo')
const secutiryProcess = require('./process.security')
const spawnProcess = require('./process.spawn')
// const terminalProcess = require('./process.terminal')
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

// STRATEGY priority for creep assignment
const automaticControllers = [
  downgradeController.id, // always on top
  unliveController.id, // catch recyclees
  mineralHarvestController.id, // catch miners to mineral
  mineralRestockController.id, // catch anyone with mineral only
  energySpecialistController.id, // catch restockers to
  energyUnspecialistController.id, // catch restockers from, if fell through
  energyTakeController.id, // above harvest, decrease harvest work
  energyHarvestController.id,
  energyRestockController.id,
  rampupController.id,
  repairController.id,
  buildController.id,
  upgradeController.id
]

const consumingPassByControllers = [
  grabController.id
]

Creep.prototype.target = function () {
  return bootstrap.getObjectById(this.memory.dest)
}

const roomActor =
{
  roomControllersPrepare: function (room) {
    for (const id in bootstrap.roomControllersPrepare) {
      bootstrap.roomControllersPrepare[id].roomPrepare(room)
    }
  },

  roomControllersObserveOwn: function (creep) {
    const controller = bootstrap.roomControllersObserveOwn[creep.memory.ctrl]
    if (controller) {
      controller.observeMyCreep(creep)
    }
  },

  roomControllersAct: function (target, creep) {
    const controller = bootstrap.roomControllers[creep.memory.ctrl]
    if (controller) {
      const rc = controller.act(target, creep)

      if (rc >= OK && _.isFunction(controller.observeMyCreep)) {
        controller.observeMyCreep(creep)
      }

      return rc === OK
    }

    return false
  },

  roomControllersControl: function (room, creeps) {
    for (const id of automaticControllers) {
      const controller = bootstrap.roomControllers[id]

      if (controller === undefined) {
        console.log('Unknown controller [' + id + ']')
        continue
      }

      if (!controller.compatible(room)) {
        continue
      }

      creeps = controller.control(room, creeps)

      // if all creeps had been taken
      if (creeps.length === 0) {
        return
      }
    }
  },

  creepControllersControl: function (controllers, room, creep) {
    for (const id of controllers) {
      const controller = bootstrap.roomControllers[id]

      if (controller === undefined) {
        console.log('Unknown controller [' + id + ']')
        continue
      }

      if (controller.filterCreep(creep)) {
        const rc = controller.act(room, creep)
        // TODO this is specific to consuming controllers
        if (rc === bootstrap.WANR_BOTH_EXHAUSED ||
            rc === bootstrap.WARN_INTENDEE_EXHAUSTED ||
            rc === bootstrap.ERR_INTENDEE_EXHAUSTED) {
          return rc
        }
      }
    }

    return OK
  },

  canBeReached: function (target, range) {
    // not that smart now
    if (range !== 1) return true

    if (target.__canBeReached !== undefined) {
      return target.__canBeReached
    }

    return true
  },

  act: function (room) {
    // mark initial time
    const t0 = Game.cpu.getUsed()

    secutiryProcess.work(room)
    roomInfoProcess.work(room)
    towerProcess.work(room)

    // STRATEGY don't execute certain processes too often and on the same tick / all rooms
    const processKey = (room.memory.intl + Game.time) % 10

    if (processKey === 0) {
      spawnProcess.work(room)
    } else if (processKey === 5) {
      linkProcess.work(room)
    }

    const roomCreeps = room.getRoomControlledCreeps()

    if (roomCreeps.length > 0) {
      // clean up controllers
      this.roomControllersPrepare(room)

      // filter per creep controllers once
      const roomConsumingPassByControllers = _.filter(
        consumingPassByControllers,
        function (controllerId) {
          const controller = bootstrap.roomControllers[controllerId]
          return controller.compatible(room)
        }
      )

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
        const consumingRc = this.creepControllersControl(roomConsumingPassByControllers, room, creep)
        if (consumingRc !== OK) {
          if (energyHarvestController.id === creep.memory.ctrl ||
              energyTakeController.id === creep.memory.ctrl ||
              mineralHarvestController.id === creep.memory.ctrl) {
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
        if (creep.__atTarget) continue
        if (creep.__target === undefined) continue

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

        // first move by cached path
        let rc = creep.moveToWrapper(
          creep.__target,
          {
            noPathFinding: true,
            reusePath: _.random(3, 5)
          }
        )

        // no movement, see if pathfinding is possible by CPU usage
        if (rc === ERR_NOT_FOUND && this.canBeReached(creep.__target, creep.memory.dact)) {
          const cpuUsed = bootstrap.hardCpuUsed(t0)
          if (cpuUsed <= room.__cpuLimit) {
            // STRATEGY tweak point for creep movement
            rc = creep.moveToWrapper(
              creep.__target,
              {
                costCallback: mapUtils.costCallback_costMatrixForRoomActivity,
                maxRooms: 1,
                range: creep.memory.dact,
                reusePath: _.random(3, 5)
              }
            )
          } else {
            // keep assignment
            rc = OK
          }
        }

        if (rc === OK) {
          this.roomControllersObserveOwn(creep)
        } else {
          creep.__target = undefined
          bootstrap.unassignCreep(creep)
        }
      }

      const unassignedCreeps = _.filter(
        roomCreeps,
        function (creep) {
          return creep.__target === undefined
        }
      )

      if (unassignedCreeps.length > 0) {
        this.roomControllersControl(room, unassignedCreeps)
      }
    }

    if (bootstrap.hardCpuUsed(t0) <= room.__cpuLimit) {
      autobuildProcess.work(room)
    }

    // if (bootstrap.hardCpuUsed(t0) <= room.__cpuLimit) {
    //   terminalProcess.work(room)
    // }

    if (Game.flags.dashboard) {
      const usedPercent = bootstrap.hardCpuUsed(t0)
      room.visual.rect(5.5, 0.25, 5 * usedPercent / 100, 0.25, { fill: '#f00' })
    }
  } // end of act method
}

module.exports = roomActor
