'use strict'

const historyActor =
{
  clearCaches: function () {
    Game.__historyActor_getObjectById = { }
    Game.__historyActor_skipActors = { }
    Game.__historyActor_skipAttackTargets = { }
    Game.__historyActor_skipHealTargets = { }
    Game.__historyActor_healers = { }
  },

  getObjectById: function (room, id) {
    // most likely case, own creep
    const ownCreep = Game.creepsById[id]
    if (ownCreep) return ownCreep

    const ownStructure = Game.structures[id]
    if (ownStructure) return ownStructure

    // check self-filled cache
    const cached = Game.__historyActor_getObjectById[id]
    if (cached) return cached

    const byId = Game.getObjectById(id)
    if (byId !== null) {
      Game.__historyActor_getObjectById[id] = byId
      return byId
    }

    const tombstones = room.find(FIND_TOMBSTONES)
    const byTombstone = _.find(tombstones, _.matchesProperty('creep.id', id))
    if (byTombstone !== undefined) {
      Game.__historyActor_getObjectById[id] = byTombstone.creep
      return byTombstone.creep
    }

    const ruins = room.find(FIND_RUINS)
    const byRuin = _.find(ruins, _.matchesProperty('structure.id', id))
    if (byRuin !== undefined) {
      Game.__historyActor_getObjectById[id] = byRuin.structure
      return byRuin.structure
    }

    // as original API
    return null
  },

  hmiName: function (something) {
    let result

    if (something.body) result = 'Creep [' + something.name + ']'
    else if (something.className) result = 'PowerCreep [' + something.name + ']'
    else if (something.structureType) result = 'Structure [' + something.structureType + ']'
    else result = 'Unknown [' + something.id + ']'

    if (something.owner) result += ' owned by [' + something.owner.username + ']'

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

  handle_EVENT_ATTACK: function (room, eventRecord) {
    // SHORTCUT fight back is automatic
    if (eventRecord.data.attackType === EVENT_ATTACK_TYPE_HIT_BACK) return
    // SHORTCUT nuke is detected elsewhere
    if (eventRecord.data.attackType === EVENT_ATTACK_TYPE_NUKE) return

    // skip objects that were already examined and found unworthy
    if (Game.__historyActor_skipActors[eventRecord.objectId]) return
    if (Game.__historyActor_skipAttackTargets[eventRecord.data.targetId]) return

    const attacker = this.getObjectById(room, eventRecord.objectId)
    if (attacker === null) {
      // SHORTCUT skip unknown
      Game.__historyActor_skipActors[eventRecord.objectId] = true
      Game.__historyActor_skipAttackTargets[eventRecord.objectId] = true
      Game.__historyActor_skipHealTargets[eventRecord.objectId] = true
      return
    }

    if (attacker.owner === undefined || attacker.my) {
      // SHORTCUT skip unowned or own
      Game.__historyActor_skipActors[eventRecord.objectId] = true
      return
    }

    const target = this.getObjectById(room, eventRecord.data.targetId)
    if (target === null) {
      // SHORTCUT skip unknown
      Game.__historyActor_skipActors[eventRecord.data.targetId] = true
      Game.__historyActor_skipAttackTargets[eventRecord.data.targetId] = true
      Game.__historyActor_skipHealTargets[eventRecord.data.targetId] = true
      return
    }

    let hostileAction
    let targetUsername
    let targetMy

    if (target.owner) {
      hostileAction = target.myOrAlly()
      targetUsername = target.owner.username
      targetMy = target.my
    } else {
      hostileAction = room.myOrAlly()
      targetUsername = room.extendedOwnerUsername()
      targetMy = room.myOrMyReserved()
    }

    if (hostileAction === false) {
      // SHORTCUT skip targets that are definitely not of interest
      Game.__historyActor_skipAttackTargets[eventRecord.data.targetId] = true
      return
    }

    // ! DETECT EDGE CASES !
    const attackerUsername = attacker.owner.username

    // most likely dismantle, but who knowns
    if (attackerUsername === targetUsername) return

    // fights between allies
    if (!targetMy && attacker.ally) return

    if (attacker.pc) {
      // STRATEGY PC reputation decrease per hostile action
      // Ally (100) to Neutral (22) in 26 actions
      // Ally (100) to Hostile (-1) in 34 actions
      // Neutral (24) to Hostile (-1) in 9 actions
      // Neutral (0) to Hostile (-1) in 1 action
      const reputation = Game.iff.decreaseReputation(attackerUsername, 3)
      console.log(this.hmiName(attacker) + ' attacked, had owner reputation changed to [' + reputation + ']')
    } else {
      Game.iff.markNPCHostile(attacker)
    }

    this.increaseDirectHarm(attacker, eventRecord.data.damage)

    if (attacker.room) {
      attacker.room._fight_ = true
    }
  },

  handle_EVENT_ATTACK_CONTROLLER: function (room, eventRecord) {
    // skip objects that were already examined and found unworthy
    if (Game.__historyActor_skipActors[eventRecord.objectId]) return
    if (Game.__historyActor_skipAttackTargets[room.name]) return

    if (!room.myOrAlly()) {
      // SHORTCUT skip rooms that are of no interest to monitor
      Game.__historyActor_skipAttackTargets[room.name] = true
      return
    }

    const attacker = this.getObjectById(room, eventRecord.objectId)
    if (attacker === null) {
      // SHORTCUT skip unknown
      Game.__historyActor_skipActors[eventRecord.objectId] = true
      Game.__historyActor_skipAttackTargets[eventRecord.objectId] = true
      Game.__historyActor_skipHealTargets[eventRecord.objectId] = true
      return
    }

    if (attacker.owner === undefined || attacker.my) {
      // SHORTCUT skip unowned or own
      Game.__historyActor_skipActors[eventRecord.objectId] = true
      return
    }

    // ! DETECT EDGE CASES !
    const attackerUsername = attacker.owner.username
    const roomUsername = room.extendedOwnerUsername()

    if (attackerUsername === roomUsername) return

    // fights between allies
    if (!room.myOrMyReserved() && attacker.ally) return

    if (attacker.pc) {
      const reputation = Game.iff.makeHostile(attackerUsername)
      console.log(this.hmiName(attacker) + ' attacked controller, had owner reputation changed to [' + reputation + ']')
    } else {
      Game.iff.markNPCHostile(attacker)
    }
  },

  handle_EVENT_HEAL: function (room, eventRecord) {
    // skip objects that were already examined and found unworthy
    if (Game.__historyActor_skipActors[eventRecord.objectId]) return
    if (Game.__historyActor_skipHealTargets[eventRecord.data.targetId]) return

    const healer = this.getObjectById(room, eventRecord.objectId)
    if (healer === null) {
      // SHORTCUT skip unknown
      Game.__historyActor_skipActors[eventRecord.objectId] = true
      Game.__historyActor_skipAttackTargets[eventRecord.objectId] = true
      Game.__historyActor_skipHealTargets[eventRecord.objectId] = true
      return
    }

    if (healer.owner === undefined || healer.my) {
      // SHORTCUT skip unowned or own
      Game.__historyActor_skipActors[eventRecord.objectId] = true
      return
    }

    let target
    if (eventRecord.data.targetId === eventRecord.objectId) {
      target = healer
    } else {
      target = this.getObjectById(room, eventRecord.data.targetId)
      if (target === null) {
        // SHORTCUT skip unknown
        Game.__historyActor_skipActors[eventRecord.data.targetId] = true
        Game.__historyActor_skipAttackTargets[eventRecord.data.targetId] = true
        Game.__historyActor_skipHealTargets[eventRecord.data.targetId] = true
        return
      }
    }

    healer.__healedWhat = target
    healer.__healedHowMuch = eventRecord.data.amount

    // special case, if healed self then have some harm accounted for
    if (healer.id === target.id) {
      this.increaseDirectHarm(healer, healer.__healedHowMuch)
    }

    Game.__historyActor_healers[healer.id] = healer
  },

  processRoomLog: function (room) {
    const eventLog = room.getEventLog()

    for (const eventRecord of eventLog) {
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
  },

  processHealers: function () {
    for (const id in Game.__historyActor_healers) {
      const healer = Game.__historyActor_healers[id]

      if (healer.__healedWhat.directHarm) {
        this.increaseSideHarm(healer, healer.__healedWhat.directHarm)
        this.increaseSideHarmPower(healer, healer.__healedHowMuch)
      }
    }
  },

  processPostLog: function () {
    this.processHealers()
  },

  act: function () {
    this.clearCaches()

    for (const room of Game.__roomValues) {
      this.processRoomLog(room)
    }

    this.processPostLog()
  }
}

module.exports = historyActor
