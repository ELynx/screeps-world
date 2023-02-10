'use strict'

const bootstrap = require('./bootstrap')

const Process = require('./process.template')

const secutiryProcess = new Process('security')

const ThreatStep = 60

secutiryProcess.work = function (room) {
  if (!room.my) return

  this.debugHeader(room)

  let threatLevel = room.memory.threat || 0
  let threatTimer = room.memory._ttt || (Game.time - ThreatStep)

  const hostileCreeps = room.find(
    FIND_CREEPS,
    {
      filter: function (creep) {
        return creep.hostile
      }
    }
  )

  if (hostileCreeps.length > 0) {
    const hostilePCs = _.some(hostileCreeps, _.property('pc'))

    if (threatTimer + ThreatStep <= Game.time) {
      if (threatLevel < bootstrap.ThreatLevelMax) {
        ++threatLevel

        // STRATEGY PC is a greater danger, increase threat
        if (hostilePCs && (threatLevel <= bootstrap.ThreatLevelLow)) {
          ++threatLevel
        }

        // STRATEGY low level rooms have no towers, increase threat
        if (room.controller && (room.controller.level < 3) && (threatLevel <= bootstrap.ThreatLevelLow)) {
          ++threatLevel
        }

        console.log(room.name + ' threat escalated to ' + threatLevel)
      }

      threatTimer = Game.time
    }

    const ctrl = room.controller

    if (hostilePCs &&
        !ctrl.safeMode &&
        !ctrl.safeModeCooldown &&
        !ctrl.upgradeBlocked &&
        ctrl.safeModeAvailable > 0) {
      const flagKey = this.id + '_'

      for (const flagName in Game.flags) {
        if (!flagName.startsWith(flagKey)) {
          continue
        }

        const flag = Game.flags[flagName]
        if (flag.pos.roomName !== room.name) {
          continue
        }

        const range = flag.getValue()
        if (range < 0) {
          continue
        }

        const trigger = flag.pos.hasInSquareArea(
          LOOK_CREEPS,
          range,
          function (creep) {
            return creep.pc && creep.hostile
          }
        )

        if (trigger) {
          const rc = ctrl.activateSafeMode()

          const notification = 'Room ' + room.name + ' requested safe mode [' + rc + ']'

          console.log(notification)
          Game.notify(notification)

          break
        }
      } // end of loop for all flags
    } // end of "if safe mode reqiest possible"
    // end of "if hostile creeps exist"
  } else {
    if (threatTimer + ThreatStep < Game.time) {
      --threatLevel
      threatTimer = Game.time

      console.log(room.name + ' threat deescalated to ' + threatLevel)
    }
  }

  if (threatLevel > 0) {
    room.memory.threat = threatLevel
    room.memory._ttt = threatTimer

    this.debugLine(room, 'Threat level ' + threatLevel)
  } else {
    room.memory.threat = undefined
    room.memory._ttt = undefined
  }
}

secutiryProcess.register()

module.exports = secutiryProcess
