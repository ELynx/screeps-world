'use strict'

const bootstrap = {
  ThreatLevelLow: 1,
  ThreatLevelMedium: 3,
  ThreatLevelMax: 5,

  RoomActTypeMy: 1,
  RoomActTypeRemoteHarvest: 2,
  RoomActTypeHelp: 3,

  // intent is valid, but next such action will exhause both intended and intendee
  WARN_BOTH_EXHAUSED: 3, // sum of two exhausted below
  // intent is valid, but next such action will exhaust intended
  WARN_INTENDED_EXHAUSTED: 2,
  // intent is valid, but next such action will exhaust intendee
  WARN_INTENDEE_EXHAUSTED: 1,
  // intent not found
  ERR_INVALID_INTENT_NAME: -10000,
  // intent args not given properly
  ERR_INVALID_INTENT_ARG: -10001,
  // intent exhaused on intendee side, such as trying to harvest with full CARRY
  ERR_INTENDEE_EXHAUSTED: -10002,
  // intent exhaused on intended side, such as trying to harvest with too many creeps from singe source
  ERR_INTENDED_EXHAUSTED: -10003,

  /**
   Same as built-in, but tries to get some shortcuts
   **/
  getObjectById: function (id) {
    // most of cases is some kind of `my` structure
    const structure = Game.structures[id]
    if (structure) return structure

    if (Game.__bootstrap__getObjectById === undefined) {
      Game.__bootstrap__getObjectById = { }
    }

    const cached = Game.__bootstrap__getObjectById[id]
    if (cached) return cached

    const found = Game.getObjectById(id)
    Game.__bootstrap__getObjectById[id] = found

    return found
  },

  /**
    CPU used from hard shard limit.
    @return integer percent of used shard limit.
    **/
  hardCpuUsed: function (from) {
    if (!Game.cpu.limit) {
      return 0
    }

    return Math.ceil(100 * (Game.cpu.getUsed() - from) / Game.cpu.limit)
  },

  /**
    Object holding references to all registered room controllers.
    **/
  roomControllers: { },

  /**
    Object holding references to all registeded task controllers.
    **/
  taskControllers: { },

  /**
    Object holding references to all registered process controllers.
    **/
  processControllers: { },

  /**
    Add a controller to list of room controllers.
    @param {Controller} controller
    **/
  registerRoomController: function (controller) {
    this.roomControllers[controller.id] = controller
  },

  /**
    Add a tasked to list of task controllers.
    @param {Tasked} tasked
    **/
  registerTaskController: function (tasked) {
    this.taskControllers[tasked.id] = tasked
  },

  /**
    Add a process to list of process controllers.
    @param {Process} process
    **/
  registerProcessController: function (processController) {
    this.processControllers[processController.id] = processController
  },

  makeItStop: function (creep, stop) {
    creep.memory._stop =
    {
      stop: { x: stop.x, y: stop.y, room: stop.roomName },
      time: Game.time,
      room: creep.room.name
    }
  },

  // imitate _move cahce
  // https://github.com/screeps/engine/blob/78631905d975700d02786d9b666b9f97b1f6f8f9/src/game/creeps.js#L286
  imitateMoveCreate: function (target, creep, path) {
    const pos = target.pos
    creep.memory._move =
    {
      dest: { x: pos.x, y: pos.y, room: pos.roomName },
      time: Game.time,
      path: Room.serializePath(path),
      room: creep.room.name
    }

    const stop = _.last(path)
    this.makeItStop(creep, stop)
  },

  imitateMoveErase: function (creep) {
    creep.memory._move = undefined
    creep.memory._stop = undefined
  },

  // empty string used to allow use as key
  NO_CONTROL: '',
  NO_DESTINATION: '',
  NO_ACT_RANGE: undefined,
  NO_EXTRA: undefined,

  /**
    @param {Creep} creep.
    @return If creep is assigned to a controller.
    **/
  creepAssigned: function (creep) {
    return creep.memory.ctrl !== this.NO_CONTROL
  },

  /**
    Assign creep to a target with controller.
    @param {Controller} controller.
    @param {???} target.
    @param {Path} targetSolution path to solution.
    @param {Creep} creep.
    @param {???} extra value stored in memory.
    **/
  assignCreep: function (controller, target, targetSolution, creep, extra) {
    creep.memory.ctrl = controller.id
    creep.memory.dest = target.id
    creep.memory.dact = controller.actRange
    creep.memory.xtra = extra

    if (targetSolution) {
      this.imitateMoveCreate(target, creep, targetSolution)
    } else {
      this.imitateMoveErase(creep)
    }
  },

  /**
    Unassign creep from target or controller.
    @param {Creep} creep.
    **/
  unassignCreep: function (creep) {
    creep.memory.ctrl = this.NO_CONTROL
    creep.memory.dest = this.NO_DESTINATION
    creep.memory.dact = this.NO_ACT_RANGE
    creep.memory.xtra = this.NO_EXTRA

    this.imitateMoveErase(creep)
  },

  activeBodyParts: function (creep) {
    if (creep.__bootstrap_activeBodyParts_done) return

    // cache often made calls
    creep._work_ = 0
    creep._carry_ = 0
    creep._move_ = 0

    // cache for movement options, since this is same procedure
    creep.__bootstrap__movementCost_nonCarryNonMove = 0
    creep.__bootstrap__movementCost_carry = 0
    creep.__bootstrap__movementCost_move = 0

    for (const part of creep.body) {
      const active = part.hits > 0 ? 1 : 0

      switch (part.type) {
        case WORK:
          creep._work_ += active
          creep.__bootstrap__movementCost_nonCarryNonMove += 1
          break
        case CARRY:
          creep._carry_ += active
          creep.__bootstrap__movementCost_carry += 1
          break
        case MOVE:
          creep._move_ += active
          // https://github.com/screeps/engine/blob/c765f04ddeb50b9edffb9796c4fcc63b304a2241/src/processor/intents/creeps/tick.js#L107C4-L107C4
          const boost = part.boost ? BOOSTS[MOVE][part.boost]['fatigue'] : 1
          creep.__bootstrap__movementCost_move += active * 2 * boost
          creep.__bootstrap__movementCost_nonCarryNonMove += (1 - active)
          break
        default:
          creep.__bootstrap__movementCost_nonCarryNonMove += 1
          break
      }
    }

    creep.__bootstrap_activeBodyParts_done = true
  },

  _movementCost: function (creep) {
    if (creep.__bootstrap__movementCost_costs === undefined) {
      this.activeBodyParts(creep)

      const nonMoveNonCarry = creep.__bootstrap__movementCost_nonCarryNonMove
      // STRATEGY save CPU on actual computation
      // under normal operation creeps are either full or empty
      const carry = creep.store.getUsedCapacity() === 0 ? 0 : creep.__bootstrap__movementCost_carry
      const move = creep.__bootstrap__movementCost_move

      creep.__bootstrap__movementCost_costs = { }

      if (move > 0) {
        const weight = nonMoveNonCarry + carry
        const factor = weight / move

        creep.__bootstrap__movementCost_costs.roadCost = Math.max(1, Math.ceil(factor))
        creep.__bootstrap__movementCost_costs.plainCost = Math.max(1, Math.ceil(1.99 * factor))
        creep.__bootstrap__movementCost_costs.swampCost = Math.max(1, Math.ceil(9.99 * factor))

        creep.__bootstrap__movementCost_costs.ignoreRoads = creep.__bootstrap__movementCost_costs.plainCost === creep.__bootstrap__movementCost_costs.swampCost
      } else {
        creep.__bootstrap__movementCost_costs.roadCost = 1
        creep.__bootstrap__movementCost_costs.plainCost = 2
        creep.__bootstrap__movementCost_costs.swampCost = 10

        creep.__bootstrap__movementCost_costs.ignoreRoads = false
      }
    }
  },

  moveOptionsWrapper: function (creep, options) {
    if (options.plainCost && options.swampCost) {
      return options
    }

    this._movementCost(creep)

    _.defaults(options, creep.__bootstrap__movementCost_costs)

    return options
  },

  centerRoomPosition: function (roomName) {
    if (roomName === undefined) {
      console.log('Attempt to take center of undefined room, shard center returned')
      return new RoomPosition(25, 25, 'E0N0')
    }

    return new RoomPosition(25, 25, roomName)
  }
}

module.exports = bootstrap
