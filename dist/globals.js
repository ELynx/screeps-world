'use strict'

const globals =
{
  ThreatLevelLow: 1,
  ThreatLevelMedium: 3,
  ThreatLevelMax: 5,

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
    Object holding references to room controllers that want to prepare for the room.
    **/
  roomControllersPrepare: { },

  /**
    Object holding references to room controllers that care for their creeps.
    **/
  roomControllersObserveOwn: { },

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

    if (controller.roomPrepare) {
      this.roomControllersPrepare[controller.id] = controller
    }

    if (controller.observeMyCreep) {
      this.roomControllersObserveOwn[controller.id] = controller
    }
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
  },

  imitateMoveErase: function (creep) {
    creep.memory._move = undefined
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
    @param {String} serialized path to solution.
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

  moveOptionsWrapper: function (options) {
    _.defaults(
      options,
      { plainCost: 1 },
      { swampCost: 5 }
    )

    return options
  },

  unwalkableBordersCostCallback: function (roomName, costMatrix) {
    if (!Game.__unwalkableBordersCostCallbackCache) Game.__unwalkableBordersCostCallbackCache = { }

    const cached = Game.__unwalkableBordersCostCallbackCache[roomName]
    if (cached) {
      return cached
    }

    const modified = costMatrix.clone()

    for (let x = 0; x <= 49; ++x) {
      modified.set(x, 0, 255)
      modified.set(x, 49, 255)
    }

    for (let y = 1; y <= 48; ++y) {
      modified.set(0, y, 255)
      modified.set(49, y, 255)
    }

    Game.__unwalkableBordersCostCallbackCache[roomName] = modified

    return modified
  },

  centerRoomPosition: function (roomName) {
    return new RoomPosition(25, 25, roomName)
  },

  cleanUpFlags: function () {
    const taskIds = Object.keys(this.taskControllers)
    const processIds = Object.keys(this.processControllers)
    const flagKeys = _.map(taskIds.concat(processIds), id => id + '_')

    for (const flagName in Game.flags) {
      if (flagName === 'profiler') continue
      if (flagName === 'recount') continue
      if (flagName === 'autobuild') continue

      if (flagName.startsWith('help_')) continue

      const processFound = _.some(
        flagKeys,
        function (id) {
          return flagName.startsWith(id)
        }
      )

      if (!processFound) {
        const flag = Game.flags[flagName]
        console.log('Removing undefined flag [' + flagName + '] at ' + flag.pos)
        flag.remove()
      }
    }
  }
}

module.exports = globals
