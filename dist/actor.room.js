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
const ttlController = require('./controller.ttl')
const upgradeController = require('./controller.upgrade')

// STRATEGY priority for creep assignment
const automaticControllres = [
  downgradeController.id, // always on top
  ttlController.id, // catch recyclees
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
  return Game.getObjectById(this.memory.dest)
}

const roomActor =
{
  verbose: false,

  debugLine: function (room, what) {
    if (this.verbose) {
      room.roomDebug(what)
    }
  },

  /**
    Prepare controllers for next room.
    @param {Room} room.
    **/
  roomControllersPrepare: function (room) {
    for (const id in bootstrap.roomControllersPrepare) {
      bootstrap.roomControllersPrepare[id].roomPrepare(room)
    }
  },

  /**
    Find controller and let it observe a creep.
    @param {Creep} creep.
    **/
  roomControllersObserveOwn: function (creep) {
    const controller = bootstrap.roomControllersObserveOwn[creep.memory.ctrl]
    if (controller) {
      controller.observeMyCreep(creep)
    }
  },

  /**
    Find a controller, execute it's act.
    @param {Object} target object.
    @param {Creep} creep.
    @return True if creep was acted upon.
    **/
  roomControllersAct: function (target, creep) {
    const controller = bootstrap.roomControllers[creep.memory.ctrl]
    if (controller) {
      return controller.act(target, creep) === OK
    }

    return false
  },

  /**
    Let room controllers do theit jobs.
    @param {Room} room.
    @param {array<Creep>} creeps.
    **/
  roomControllersControl: function (room, creeps) {
    for (const index in automaticControllres) {
      const id = automaticControllres[index]
      const controller = bootstrap.roomControllers[id]

      if (controller === undefined) {
        this.debugLine(room, 'Unknown controller [' + id + ']')
        continue
      }

      if (!controller.compatible(room)) {
        this.debugLine(room, 'Skipping incompatible controller [' + id + ']')
        continue
      }

      creeps = controller.control(room, creeps)

      // if all creeps had been taken
      if (creeps.length === 0) {
        this.debugLine(room, 'All creeps assigned after controller [' + id + ']')
        return
      } else {
        this.debugLine(room, 'Creeps left after controller [' + id + ']: ' + creeps.length)
      }
    }
  },

  _passByControllersControl: function (controllers, room, creep) {
    for (const index in controllers) {
      const id = controllers[index]
      const controller = bootstrap.roomControllers[id]

      if (controller === undefined) {
        this.debugLine(room, 'Unknown controller [' + id + ']')
        continue
      }

      if (!controller.compatible(room)) {
        this.debugLine(room, 'Skipping incompatible controller [' + id + ']')
        continue
      }

      if (controller.filterCreep(creep)) {
        const rc = controller.act(undefined, creep)
        if (rc === bootstrap.WARN_INTENDEE_EXHAUSTED ||
            rc === bootstrap.WANR_BOTH_EXHAUSED ||
            rc === bootstrap.ERR_INTENDEE_EXHAUSTED) {
          return rc
        }
      }
    }

    return OK
  },

  consumingPassByControllersControl: function (room, creep) {
    return this._passByControllersControl(consumingPassByControllers, room, creep)
  },

  /**
    @param {Room} room
    **/
  act: function (room) {
    // mark initial time
    const t0 = Game.cpu.getUsed()

    // clean up controllers
    this.roomControllersPrepare(room)

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
      // do some statistics
      let spawning = 0
      let assigned = 0
      let working = 0
      let resting = 0
      let moving = 0

      for (let i = 0; i < roomCreeps.length; ++i) {
        const creep = roomCreeps[i]

        // spawning creep can do nothing
        if (creep.spawning) {
          ++spawning
          continue
        }

        // code that migrate creeps into room of registration
        if (creep.memory.crum !== creep.room.name || creep.memory.rcng) {
          // to take off any work from previous room
          bootstrap.unassignCreep(creep)

          // flag to handle border transition
          creep.memory.rcng = true

          if (creep.fatigue === 0) {
            // get off border area
            const posInDestRoom = bootstrap.centerRoomPosition(creep.memory.crum)
            const rangeInDestRoom = posInDestRoom.offBorderDistance()

            if (creep.pos.inRangeTo(posInDestRoom, rangeInDestRoom)) {
              // drop and forget the flag
              // not continue, can be used
              creep.memory.rcng = undefined
            } else {
              creep.moveToWrapper(posInDestRoom, { reusePath: 50, range: rangeInDestRoom })
              ++moving
              continue // to next creep
            }
          } else {
            continue // to the next creep
          }
        } // end of subroutine of room change

        const consumingRc = this.consumingPassByControllersControl(room, creep)
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
              working = working + keepAssignment
            } else {
              if (creep.getActiveBodyparts(MOVE) === 0) {
                keepAssignment = false
              } else if (creep.fatigue > 0) {
                keepAssignment = true
                ++resting
              } else {
                // STRATEGY creep movement, main CPU sink

                // first move by cached path
                let rc = creep.moveToWrapper(target, { noPathFinding: true })

                // no movement, see if pathfinding is possible
                if (rc === ERR_NOT_FOUND) {
                  // percent
                  const cpuUsed = bootstrap.hardCpuUsed(t0)
                  if (cpuUsed <= room.memory.cpul) {
                    // STRATEGY tweak point for creep movement
                    rc = creep.moveToWrapper(
                      target,
                      {
                        costCallback: mapUtils.costCallback_costMatrixWithUnwalkableBorders,
                        maxRooms: 1,
                        range: creep.memory.dact
                      }
                    )
                  } else {
                    // so assignment is not dropped
                    rc = OK
                    this.debugLine(room, 'Creep ' + creep.name + ' stalls')
                    creep.say('(P)')
                  }
                }

                keepAssignment = rc === OK
                moving = moving + keepAssignment
              } // end of "has MOVE" and "fatigue equals 0"
            } // end of "not in range"
          } // end of if target found

          if (keepAssignment) {
            this.roomControllersObserveOwn(creep)
            ++assigned
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

      // log statistics
      this.debugLine(room, 'Busy creeps ' + assigned)
      this.debugLine(room, '-> spawning ' + spawning)
      this.debugLine(room, '-> working  ' + working)
      this.debugLine(room, '-> resting  ' + resting)
      this.debugLine(room, '-> moving   ' + moving)
      this.debugLine(room, 'Free creeps ' + unassignedCreeps.length)
    } // end of roomCreeps

    if (unassignedCreeps.length > 0) {
      this.roomControllersControl(room, unassignedCreeps)
    }

    if (bootstrap.hardCpuUsed(t0) <= room.memory.cpul) {
      autobuildProcess.work(room)
    }

    if (bootstrap.hardCpuUsed(t0) <= room.memory.cpul) {
      terminalProcess.work(room)
    }

    const usedPercent = bootstrap.hardCpuUsed(t0)
    this.debugLine(room, 'HCPU: ' + usedPercent + '% out of assigned ' + room.memory.cpul + '% on room actor')
    room.visual.rect(5.5, 0.25, 5 * usedPercent / 100, 0.25, { fill: '#f00' })
  } // end of act method
}

module.exports = roomActor
