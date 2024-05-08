'use strict'

const bootstrap = require('./bootstrap')

const Process = require('./process.template')

const secutiryProcess = new Process('security')

const ThreatStep = 60

secutiryProcess.roomCompatible = function (room) {
  if (room.myOrMyReserved()) return true
  if (room.sourceKeeper()) return true
  if (room.unowned) return true

  return false
}

secutiryProcess.work = function (room) {
  if (!this.roomCompatible(room)) return

  room.memory.nodeAccessed = Game.time

  const threatWas = room.memory.threat
  let threatLevel = threatWas || 0
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
    const hostilePCs = _.filter(hostileCreeps, _.property('pc'))

    if (threatTimer + ThreatStep <= Game.time) {
      if (threatLevel < bootstrap.ThreatLevelMax) {
        ++threatLevel

        // STRATEGY PC is a greater danger, increase threat
        if ((hostilePCs.length > 0) && (threatLevel <= bootstrap.ThreatLevelLow)) {
          ++threatLevel
        }

        // STRATEGY low level rooms have no towers, increase threat
        if (room._my_ && (room.towers.size === 0) && (threatLevel <= bootstrap.ThreatLevelLow)) {
          ++threatLevel
        }

        room._threatEscalated_ = true

        console.log(room.name + ' threat escalated to ' + threatLevel)
      }

      threatTimer = Game.time
    }

    if (hostilePCs.length > 0 && room.controller && room.controller.my && room.controller.canActivateSafeMode()) {
      const flags = _.filter(Array.from(room.flags.values()), _.matchesProperty('shortcut', this.id))

      for (const flag of flags) {
        const range = flag.getValue()
        if (range < 0) {
          flag.remove()
          continue
        }

        const trigger = _.some(
          hostilePCs,
          function (someCreep) {
            return someCreep.pos.inRangeTo(flag.pos, range)
          }
        )

        if (trigger) {
          const rc = room.controller.activateSafeMode()

          const notification = 'Room [' + room.name + '] requested safe mode [' + rc + ']'

          console.log(notification)
          Game.notify(notification)

          break
        }
      }
    } // end of "if safe mode reqiest possible"
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
  } else {
    room.memory.threat = undefined
    room.memory._ttt = undefined
  }
}

secutiryProcess.register()

module.exports = secutiryProcess
