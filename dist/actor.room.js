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

// STRATEGY priority for creep assignment
const automaticControllers = [
  downgradeController.id, // always on top
  unliveController.id, // catch recyclees
  rampupController.id, // build up the ramps and walls to decent level right up
  mineralHarvestController.id, // catch miners to mineral
  mineralRestockController.id, // catch anyone with mineral only
  energySpecialistController.id, // catch restockers to
  energyUnspecialistController.id, // catch restockers from, if fell through
  energyTakeController.id, // above harvest, decrease harvest work
  energyHarvestController.id,
  energyRestockController.id,
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
      return controller.act(target, creep) === OK
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

    // creeps that has no controller assigned will go here
    const unassignedCreeps = []

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

      for (const creep of roomCreeps) {
        // spawning creep can do nothing
        if (creep.spawning) {
          continue
        }

        // code that migrate creeps into room of registration
        if (creep.memory.crum !== creep.room.name || creep.memory.rcng) {
          // TODO understand why and probably remove
          // to take off any work from previous room
          bootstrap.unassignCreep(creep)

          // flag to handle border transition
          creep.memory.rcng = true

          if (creep.getActiveBodyparts(MOVE) > 0 && creep.fatigue === 0) {
            // get off border area
            const posInDestRoom = bootstrap.centerRoomPosition(creep.memory.crum)
            const rangeInDestRoom = posInDestRoom.offBorderDistance()

            if (creep.pos.inRangeTo(posInDestRoom, rangeInDestRoom)) {
              // drop and forget the flag
              // not continue, can be used
              creep.memory.rcng = undefined
            } else {
              creep.moveToWrapper(
                posInDestRoom,
                {
                  range: rangeInDestRoom,
                  reusePath: _.random(7, 11)
                }
              )
              continue // to next creep
            }
          } else {
            continue // to the next creep
          }
        } // end of subroutine of room change

        const consumingRc = this.creepControllersControl(roomConsumingPassByControllers, room, creep)
        if (consumingRc !== OK) {
          if (energyHarvestController.id === creep.memory.ctrl ||
              energyTakeController.id === creep.memory.ctrl ||
              mineralHarvestController.id === creep.memory.ctrl) {
            bootstrap.unassignCreep(creep)
          }
        }

        if (bootstrap.creepAssigned(creep)) {
          // flag if target should be carried to next loop
          let keepAssignment = false

          const target = creep.target()

          if (target) {
            if (creep.pos.inRangeTo(target, creep.memory.dact)) {
              keepAssignment = this.roomControllersAct(target, creep)
            } else {
              if (creep.getActiveBodyparts(MOVE) === 0) {
                keepAssignment = false
              } else if (creep.fatigue > 0) {
                keepAssignment = true
              } else {
                // STRATEGY creep movement, main CPU sink

                // first move by cached path
                let rc = creep.moveToWrapper(
                  target,
                  {
                    noPathFinding: true
                  }
                )

                // no movement, see if pathfinding is possible
                if (rc === ERR_NOT_FOUND) {
                  // percent
                  const cpuUsed = bootstrap.hardCpuUsed(t0)
                  if (cpuUsed <= room.__cpuLimit) {
                    // STRATEGY tweak point for creep movement
                    rc = creep.moveToWrapper(
                      target,
                      {
                        costCallback: mapUtils.costCallback_costMatrixWithUnwalkableBorders,
                        maxRooms: 1,
                        range: creep.memory.dact,
                        reusePath: _.random(7, 11)
                      }
                    )
                  } else {
                    // so assignment is not dropped
                    rc = OK
                    creep.say('(P)')
                  }
                }

                keepAssignment = rc === OK
              } // end of "has MOVE" and "fatigue equals 0"
            } // end of "not in range"
          } // end of if target found

          if (keepAssignment) {
            this.roomControllersObserveOwn(creep)
          } else {
            bootstrap.unassignCreep(creep)
            unassignedCreeps.push(creep)
          }
          // end of creep assigned
        } else {
          // not creep assigned
          unassignedCreeps.push(creep)
        }
      } // end of creeps loop
    } // end of roomCreeps

    if (unassignedCreeps.length > 0) {
      this.roomControllersControl(room, unassignedCreeps)
    }

    if (bootstrap.hardCpuUsed(t0) <= room.__cpuLimit) {
      autobuildProcess.work(room)
    }

    if (bootstrap.hardCpuUsed(t0) <= room.__cpuLimit) {
      terminalProcess.work(room)
    }

    if (Game.flags.dashboard) {
      const usedPercent = bootstrap.hardCpuUsed(t0)
      room.visual.rect(5.5, 0.25, 5 * usedPercent / 100, 0.25, { fill: '#f00' })
    }
  } // end of act method
}

module.exports = roomActor
