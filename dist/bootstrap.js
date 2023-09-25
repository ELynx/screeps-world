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

    if (Game.__bootstrap_getObjectById === undefined) {
      Game.__bootstrap_getObjectById = { }
    }

    const cached = Game.__bootstrap_getObjectById[id]
    if (cached) return cached

    const found = Game.getObjectById(id)
    Game.__bootstrap_getObjectById[id] = found

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

  _movementCost: function (creep) {
    if (creep.__movementCost === undefined) {
      const nonMoveNonCarry = creep._move_options__non_carry_non_move_
      let carry = creep._move_options__carry_
      const move = creep._move_options__move_

      // STRATEGY save CPU on actual computation
      // under normal operation creeps are either full or empty
      if (creep.store.getUsedCapacity() === 0) {
        carry = 0
      }

      creep.__movementCost = { }

      if (move > 0) {
        const weight = nonMoveNonCarry + carry
        const factor = weight / move

        creep.__movementCost.roadCost = Math.max(1, Math.ceil(factor))
        creep.__movementCost.plainCost = Math.max(1, Math.ceil(1.99 * factor))
        creep.__movementCost.swampCost = Math.max(1, Math.ceil(9.99 * factor))

        creep.__movementCost.ignoreRoads = creep.__movementCost.plainCost === creep.__movementCost.swampCost
      } else {
        creep.__movementCost.roadCost = 1
        creep.__movementCost.plainCost = 2
        creep.__movementCost.swampCost = 10

        creep.__movementCost.ignoreRoads = false
      }
    }
  },

  moveOptionsWrapper: function (creep, options) {
    if (options.plainCost && options.swampCost) {
      return options
    }

    this._movementCost(creep)

    _.defaults(options, creep.__movementCost)

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
