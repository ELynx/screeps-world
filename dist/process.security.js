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

  const allCreeps = room.find(FIND_CREEPS)
  const hostileCreeps = _.filter(
    allCreeps,
    creep => creep.hostile && creep.ticksToLive > (room.controller.safeMode || 1)
  )

  if (hostileCreeps.length > 0) {
    const hostilePCs = []

    for (const creep of hostileCreeps) {
      if (!creep.pc) continue

      const body = creep.body
      for (const bodyPart of body) {
        if (bodyPart.type === CARRY) continue
        if (bodyPart.type === HEAL) continue
        if (bodyPart.type === MOVE) continue
        if (bodyPart.type === TOUGH) continue

        hostilePCs.push(creep)
        break
      }
    }

    if (threatTimer + ThreatStep <= Game.time && room.memory.nothreat !== true) {
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
          someCreep => {
            return someCreep.pos.inRangeTo(flag.pos, range)
          }
        )

        if (trigger) {
          const rc = room.controller.activateSafeMode()

          const notification = 'Room [' + room.name + '] requested safe mode [' + rc + ']'

          console.log(notification)
          Game.notify(notification)

          if (rc >= OK) {
            threatLevel = 0
            room._threatEscalated_ = undefined
            console.log(room.name + ' safe more set threat level to ' + threatLevel)
          }

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
