'use strict'

const bootstrap = require('./bootstrap')

const historyActor =
{
  verbose: true,

  debugLine: function (room, what) {
    if (this.verbose) {
      room.roomDebug(what)
    }
  },

  handle_EVENT_ATTACK: function (room, eventRecord) {
    // skip objects out of interest
    if (Game.__handle_EVENT_ATTACK_attackers[eventRecord.objectId]) return
    if (Game.__handle_EVENT_ATTACK_targets[eventRecord.data.targetId]) return

    // SHORTCUT fight back is automatic
    if (eventRecord.data.attackType === EVENT_ATTACK_TYPE_HIT_BACK) return
    // SHORTCUT nuke is detected elsewhere
    if (eventRecord.data.attackType === EVENT_ATTACK_TYPE_NUKE) return

    const attacker = Game.getObjectById(eventRecord.objectId)
    if (attacker === undefined ||
        attacker.owner === undefined ||
        attacker.my) {
      // SHORTCUT skip dead, unowned or own
      Game.__handle_EVENT_ATTACK_attackers[eventRecord.objectId] = true
      return
    }

    const target = Game.getObjectById(eventRecord.data.targetId)
    if (target === undefined) {
      // SHORTCUT skip dead
      Game.__handle_EVENT_ATTACK_targets[eventRecord.data.targetId] = true
      return
    }

    let hostileAction = false

    if (target.owner) {
      hostileAction = target.myOrAlly()
    } else {
      hostileAction = room.myOrAlly()
    }

    if (hostileAction === false) {
      // SHORTCUT skip uninterested
      Game.__handle_EVENT_ATTACK_targets[eventRecord.data.targetId] = true
      return
    }

    // SHORTCUT check hostile once
    Game.__handle_EVENT_ATTACK_attackers[eventRecord.objectId] = true

    Game.iff.markHostile(attacker)

    if (attacker.pc) {
      Game.iff.decreaseReputation(attacker.owner.username, 1)
    }
  },

  /**
    Execute history logic.
    **/
  act: function () {
    // mark initial overall time
    const t0 = Game.cpu.getUsed()

    Game.__handle_EVENT_ATTACK_attackers = { }
    Game.__handle_EVENT_ATTACK_targets = { }

    for (const roomName in Game.rooms) {
      const t1 = Game.cpu.getUsed()

      const room = Game.rooms[roomName]
      room.visual.rect(0, 0, 5, 0.5, { fill: '#0f0' })

      const eventLog = room.getEventLog()

      for (const index in eventLog) {
        const eventRecord = eventLog[index]

        switch (eventRecord.event) {
          case EVENT_ATTACK:
            this.handle_EVENT_ATTACK(room, eventRecord)
            break
        }
      }

      const usedRoomPercent = bootstrap.hardCpuUsed(t1)
      this.debugLine(room, 'HCPU: ' + usedRoomPercent + '% on history actor / room')
      room.visual.rect(0, 0.25, 5 * usedRoomPercent / 100, 0.25, { fill: '#f00' })
    }

    const usedTotalPercent = bootstrap.hardCpuUsed(t0)
    for (const roomName in Game.rooms) {
      const room = Game.rooms[roomName]
      this.debugLine(room, 'HCPU: ' + usedTotalPercent + '% on history actor / total')
      room.visual.rect(0, 0, 5 * usedTotalPercent / 100, 0.5, { fill: '#03f' })
    }
  }
}

module.exports = historyActor
