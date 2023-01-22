'use strict';

var globals =
{
    // intent is valid, but next such action will be invalid
    WARN_LAST_INTENT        = 1,
    // intent name not found
    ERR_INVALID_INTENT_NAME = -16,
    // intent args not given
    ERR_INVALID_INTENT_ARG  = -17,
    // intent pipeline conflict
    ERR_DUPLICATE_INTENT    = -18,

    /**
    CPU used from hard shard limit.
    @return integer percent of used shard limit.
    **/
    hardCpuUsed: function(from)
    {
        if (!Game.cpu.limit)
        {
            return 0;
        }

        return Math.ceil(100 * (Game.cpu.getUsed() - from) / Game.cpu.limit);
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
    Add a controller to list of room controllers.
    @param {Controller} controller
    **/
    registerRoomController: function(controller)
    {
        this.roomControllers[controller.id] = controller;

        if (controller.roomPrepare)
        {
            this.roomControllersPrepare[controller.id] = controller;
        }

        if (controller.observeMyCreep)
        {
            this.roomControllersObserveOwn[controller.id] = controller;
        }
    },

    /**
    Add a tasked to list of task controllers.
    @param {Tasked} tasked
    **/
    registerTaskController: function(tasked)
    {
        this.taskControllers[tasked.id] = tasked;
    },

    // imitate _move cahce
    // https://github.com/screeps/engine/blob/78631905d975700d02786d9b666b9f97b1f6f8f9/src/game/creeps.js#L286
    imitateMoveCreate: function(target, creep, path)
    {
        const pos = target.pos;
        creep.memory._move =
        {
            dest: { x: pos.x, y: pos.y, room: pos.roomName },
            time: Game.time,
            path: Room.serializePath(path),
            room: pos.roomName
        };
    },

    imitateMoveErase: function(creep)
    {
        creep.memory._move = undefined;
    },

    // empty string used to allow use as key
    NO_CONTROL:     '',
    NO_DESTINATION: '',
    NO_ACT_RANGE:   undefined,
    NO_EXTRA:       undefined,

    /**
    @param {Creep} creep.
    @return If creep is assigned to a controller.
    **/
    creepAssigned: function(creep)
    {
        return creep.memory.ctrl != this.NO_CONTROL;
    },

    /**
    Assign creep to a target with controller.
    @param {Controller} controller.
    @param {???} target.
    @param {String} serialized path to solution.
    @param {Creep} creep.
    @param {???} extra value stored in memory.
    **/
    assignCreep: function(controller, target, targetSolution, creep, extra)
    {
        creep.memory.ctrl = controller.id;
        creep.memory.dest = target.id;
        creep.memory.dact = controller.actRange;
        creep.memory.xtra = extra;

        if (targetSolution)
        {
            this.imitateMoveCreate(target, creep, targetSolution);
        }
        else
        {
            this.imitateMoveErase(creep);
        }
    },

    /**
    Unassign creep from target or controller.
    @param {Creep} creep.
    **/
    unassignCreep: function(creep)
    {
        creep.memory.ctrl = this.NO_CONTROL;
        creep.memory.dest = this.NO_DESTINATION;
        creep.memory.dact = this.NO_ACT_RANGE;
        creep.memory.xtra = this.NO_EXTRA;

        this.imitateMoveErase(creep);
    },

    moveOptionsWrapper: function(options)
    {
        _.defaults(
            options,
            { plainCost: 1 },
            { swampCost: 5 }
        );

        return options;
    }
};

module.exports = globals;
