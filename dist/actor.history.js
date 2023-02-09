'use strict'

const bootstrap = require('./bootstrap')

const historyActor =
{
  verbose: false,

  debugLine: function (room, what) {
    if (this.verbose) {
      room.roomDebug(what)
    }
  },

  clearCaches: function () {
    Game.__idCache = { }
    Game.__skipActors = { }
    Game.__skipAttackTargets = { }
    Game.__skipHealTargets = { }
    Game.__healers = { }
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
      Game.__idCache[id] = byTombstone.creep
      return byTombstone.creep
    }

    const ruins = room.find(FIND_RUINS)
    const byRuin = _.find(ruins, _.matchesProperty('structure.id', id))
    if (byRuin !== undefined) {
      Game.__idCache[id] = byRuin.structure
      return byRuin.structure
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

  _increaseSomeValue: function (something, valueName, amount) {
    const now = something[valueName] || 0
    something[valueName] = now + amount
  },

  increaseDirectHarm: function (something, amount) {
    this._increaseSomeValue(something, 'directHarm', amount)
  },

  increaseSideHarm: function (something, amount) {
    this._increaseSomeValue(something, 'sideHarm', amount)
  },

  increaseSideHarmPower: function (something, amount) {
    this._increaseSomeValue(something, 'sideHarmPower', amount)
  },

  markNPCHostile: function (room, something, somethingUsername) {
    const reputation = Game.iff.markNPCHostile(something)
    this.debugLine(room, this.hmiName(something) + ' owned by NPC [' + somethingUsername + '] had reputation changed to ' + reputation)
  },

  handle_EVENT_ATTACK: function (room, eventRecord) {
    // skip objects that were already examined and found unworthy
    if (Game.__skipActors[eventRecord.objectId]) return
    if (Game.__skipAttackTargets[eventRecord.data.targetId]) return

    // SHORTCUT fight back is automatic
    if (eventRecord.data.attackType === EVENT_ATTACK_TYPE_HIT_BACK) return
    // SHORTCUT nuke is detected elsewhere
    if (eventRecord.data.attackType === EVENT_ATTACK_TYPE_NUKE) return

    const attacker = this.getObjectById(room, eventRecord.objectId)
    if (attacker === null) {
      // SHORTCUT skip unknown
      Game.__skipActors[eventRecord.objectId] = true
      Game.__skipAttackTargets[eventRecord.objectId] = true
      Game.__skipHealTargets[eventRecord.objectId] = true
      return
    }

    if (attacker.owner === undefined || attacker.my) {
      // SHORTCUT skip unowned or own
      Game.__skipActors[eventRecord.objectId] = true
      return
    }

    const target = this.getObjectById(room, eventRecord.data.targetId)
    if (target === null) {
      // SHORTCUT skip unknown
      Game.__skipActors[eventRecord.data.targetId] = true
      Game.__skipAttackTargets[eventRecord.data.targetId] = true
      Game.__skipHealTargets[eventRecord.data.targetId] = true
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
      targetMy = room.my
    }

    if (hostileAction === false) {
      // SHORTCUT skip targets that are definitely not of interest
      Game.__skipAttackTargets[eventRecord.data.targetId] = true
      return
    }

    // ! DETECT EDGE CASES !
    const attackerUsername = attacker.owner.username

    // most likely dismantle, but who knowns
    if (attackerUsername === targetUsername) return

    // fights between allies
    if (attacker.ally && (!targetMy)) return

    if (attacker.pc) {
      // STRATEGY PC reputation decrease per hostile action
      // Ally (100) to Neutral (22) in 26 actions
      // Ally (100) to Hostile (-1) in 34 actions
      // Neutral (24) to Hostile (-1) in 9 actions
      // Neutral (0) to Hostile (-1) in 1 action
      const reputation = Game.iff.decreaseReputation(attackerUsername, 3)
      this.debugLine(room, this.hmiName(attacker) + ' owned by PC [' + attackerUsername + '] attacked, had owner reputation changed to ' + reputation)
    } else {
      this.markNPCHostile(room, attacker, attackerUsername)
    }

    this.increaseDirectHarm(attacker, eventRecord.data.damage)
  },

  handle_EVENT_ATTACK_CONTROLLER: function (room, eventRecord) {
    // skip objects that were already examined and found unworthy
    if (Game.__skipActors[eventRecord.objectId]) return
    if (Game.__skipAttackTargets[room.name]) return

    if (!room.myOrAlly()) {
      // SHORTCUT skip rooms that are of no interest to monitor
      Game.__skipAttackTargets[room.name] = true
      return
    }

    const attacker = this.getObjectById(room, eventRecord.objectId)
    if (attacker === null) {
      // SHORTCUT skip unknown
      Game.__skipActors[eventRecord.objectId] = true
      Game.__skipAttackTargets[eventRecord.objectId] = true
      Game.__skipHealTargets[eventRecord.objectId] = true
      return
    }

    if (attacker.owner === undefined || attacker.my) {
      // SHORTCUT skip unowned or own
      Game.__skipActors[eventRecord.objectId] = true
      return
    }

    // ! DETECT EDGE CASES !
    const attackerUsername = attacker.owner.username
    const roomUsername = (room.controller && room.controller.owner) ? room.controller.owner.username : undefined

    if (attackerUsername === roomUsername) return

    // fights between allies
    if (attacker.ally && (!room.my)) return

    if (attacker.pc) {
      const reputation = Game.iff.makeHostile(attackerUsername)
      this.debugLine(room, this.hmiName(attacker) + ' owned by PC [' + attackerUsername + '] attacked controller, had owner reputation changed to ' + reputation)
    } else {
      this.markNPCHostile(room, attacker, attackerUsername)
    }
  },

  handle_EVENT_HEAL: function (room, eventRecord) {
    // skip objects that were already examined and found unworthy
    if (Game.__skipActors[eventRecord.objectId]) return
    if (Game.__skipHealTargets[eventRecord.data.targetId]) return

    const healer = this.getObjectById(room, eventRecord.objectId)
    if (healer === null) {
      // SHORTCUT skip unknown
      Game.__skipActors[eventRecord.objectId] = true
      Game.__skipAttackTargets[eventRecord.objectId] = true
      Game.__skipHealTargets[eventRecord.objectId] = true
      return
    }

    if (healer.owner === undefined || healer.my) {
      // SHORTCUT skip unowned or own
      Game.__skipActors[eventRecord.objectId] = true
      return
    }

    const target = this.getObjectById(room, eventRecord.data.targetId)
    if (target === null) {
      // SHORTCUT skip unknown
      Game.__skipActors[eventRecord.data.targetId] = true
      Game.__skipAttackTargets[eventRecord.data.targetId] = true
      Game.__skipHealTargets[eventRecord.data.targetId] = true
      return
    }

    healer.__healedWhat = target
    healer.__healedHowMuch = eventRecord.data.amount

    Game.__healers[healer.id] = healer
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
          case EVENT_ATTACK_CONTROLLER:
            this.handle_EVENT_ATTACK_CONTROLLER(room, eventRecord)
            break
          case EVENT_HEAL:
            this.handle_EVENT_HEAL(room, eventRecord)
            break
        }
      }

      const usedRoomPercent = bootstrap.hardCpuUsed(t1)
      this.debugLine(room, 'HCPU: ' + usedRoomPercent + '% on history actor / room')
      room.visual.rect(0, 0.25, 5 * usedRoomPercent / 100, 0.25, { fill: '#f00' })
    }

    for (const id in Game.__healers) {
      const healer = Game.__healers[id]

      if (healer.__healedWhat.directHarm) {
        this.increaseSideHarm(healer, healer.__healedWhat.directHarm)
        this.increaseSideHarmPower(healer, healer.__healedHowMuch)
      }
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
