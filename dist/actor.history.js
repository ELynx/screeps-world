'use strict'

const bootstrap = require('./bootstrap')

const historyActor =
{
  verbose: true,

  debugLine: function (room, what) {
    if (this.verbose) {
      room.roomDebug(what)
      console.log(what)
    }
  },

  clearCaches: function () {
    Game.__idCache = { }
    Game.__handle_EVENT_ATTACK_attackers = { }
    Game.__handle_EVENT_ATTACK_targets = { }
  },

  getObjectById: function (room, id) {
    const cached = Game.__idCache[id]
    if (cached) return cached

    const byId = Game.getObjectById(id)
    if (byId !== null) {
      Game.__idCache[id] = byId
      return byId
    }

    const tombstones = room.find(FIND_TOMBSTONES)
    const byTombstone = _.find(tombstones, _.matchesProperty('creep.id', id))
    if (byTombstone !== undefined) {
      Game.__idCache[id] = byTombstone
      return byTombstone
    }

    const ruins = room.find(FIND_RUINS)
    const byRuin = _.find(ruins, _.matchesProperty('structure.id', id))
    if (byRuin !== undefined) {
      Game.__idCache[id] = byRuin
      return byRuin
    }

    // as original API
    return null
  },

  hmiName: function (something) {
    let result

    if (something.body) result = 'Creep [' + something.name + ']'
    else if (something.structureType) result = 'Structure [' + something.structureType + ']'
    else result = 'Unknown [' + something.id + ']'

    if (something.pos) result += ' at ' + something.pos

    return result
  },

  handle_EVENT_ATTACK: function (room, eventRecord) {
    // skip objects that were already examined
    if (Game.__handle_EVENT_ATTACK_attackers[eventRecord.objectId]) return
    if (Game.__handle_EVENT_ATTACK_targets[eventRecord.data.targetId]) return

    // SHORTCUT fight back is automatic
    if (eventRecord.data.attackType === EVENT_ATTACK_TYPE_HIT_BACK) return
    // SHORTCUT nuke is detected elsewhere
    if (eventRecord.data.attackType === EVENT_ATTACK_TYPE_NUKE) return

    const attacker = this.getObjectById(room, eventRecord.objectId)
    if (attacker === null ||
        attacker.owner === undefined ||
        attacker.my) {
      // SHORTCUT skip unknown, unowned or own
      Game.__handle_EVENT_ATTACK_attackers[eventRecord.objectId] = true
      return
    }

    const target = this.getObjectById(room, eventRecord.data.targetId)
    if (target === null) {
      // SHORTCUT skip unknown
      Game.__handle_EVENT_ATTACK_targets[eventRecord.data.targetId] = true
      return
    }

    let hostileAction = false
    let targetUsername
    let targetMy

    if (target.owner) {
      hostileAction = target.myOrAlly()
      targetUsername = target.owner.username
      targetMy = target.my
    } else {
      hostileAction = room.myOrAlly()
      targetUsername = (room.controller && room.controller.owner) ? room.controller.owner.username : undefined
      targetMy = room.controller ? room.controller.my : false
    }

    if (hostileAction === false) {
      // SHORTCUT skip targets that are definitely not of interest
      Game.__handle_EVENT_ATTACK_targets[eventRecord.data.targetId] = true
      return
    }

    // ! DETECT EDGE CASES !
    const attackerUsername = attacker.owner.username

    // most likely dismantle, but who knowns
    if (attackerUsername === targetUsername) return

    // fights between allies
    if (attacker.ally && (!targetMy)) return

    // SHORTCUT check hostile once
    Game.__handle_EVENT_ATTACK_attackers[eventRecord.objectId] = true

    if (attacker.pc) {
      // STRATEGY PC reputation decrease per hostile action
      // Ally (100) to Neutral (22) in 26 actions
      // Ally (100) to Hostile (-1) in 34 actions
      // Neutral (24) to Hostile (-1) in 9 actions
      // Neutral (0) to Hostile (-1) in 1 action
      const reputation = Game.iff.decreaseReputation(attackerUsername, 3)
      this.debugLine(room, this.hmiName(attacker) + ' owned by '  attackerUsername + ' had owner reputation changed to ' + reputation)
    } else {
      const reputation = Game.iff.markNPCHostile(attacker)
      this.debugLine(room, this.hmiName(attacker) + ' NPC had reputation changed to ' + reputation)
    }
  },

  /**
    Execute history logic.
    **/
  act: function () {
    // mark initial overall time
    const t0 = Game.cpu.getUsed()

    this.clearCaches()

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
