'use strict';

var globals =
{
    /**
    CPU used from hard shard limit.
    @return integer percent of used shard limit.
    **/
    hardCpuUsed: function(from)
    {
        return Math.ceil(100 * (Game.cpu.getUsed() - from) / Game.cpu.limit);
    },

    /**
    CPU used from shard limit and bucket.
    @return integer percent of used shard limit and bucket.
    **/
    softCpuUsed: function(from)
    {
        return Math.ceil(100 * (Game.cpu.getUsed() - from) / Game.cpu.tickLimit);
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
    Object holding references to room controllers that care for all creeps.
    **/
    roomControllersObserveAll: { },

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

        if (controller.observeAllCreeps)
        {
            this.roomControllersObserveAll[controller.id] = controller;
        }
    },

    NO_CONTROL: '',
    NO_DESTINATION: '',
    NO_ACT_RANGE: undefined,
    NO_EXTRA: undefined,

    /**
    @param {Creep} creep.
    @return If creep is assigned to a controller.
    **/
    creepAssigned: function(creep)
    {
        return creep.memory.ctrl != this.NO_CONTROL && !creep.spawning && !creep.memory.manual;
    },

    /**
    @param {Creep} creep.
    @return If creep is not assigned to a controller.
    **/
    creepNotAssigned: function(creep)
    {
        return creep.memory.ctrl == this.NO_CONTROL && !creep.spawning && !creep.memory.manual;
    },

    /**
    Assign creep to a target with controller.
    @param {Controller} controller.
    @param {???} target.
    @param {Creep} creep.
    **/
    assignCreep: function(controller, target, creep, extra)
    {
        creep.memory.ctrl = controller.id;
        creep.memory.dest = target.id;
        creep.memory.dact = controller.actRange;
        creep.memory.xtra = extra;
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
    },

    /**
    @param {Creep} creep.
    @return IGame object creep is targeted to.
    **/
    creepTarget: function(creep)
    {
        return Game.getObjectById(creep.memory.dest);
    },

    /**
    Get creep strength for given room energy level.
    @param {integer} Room level.
    @return Strength.
    **/
    roomEnergyToStrength: function(elvl)
    {
        // STRATEGY limit to 3 to avoid hyper-expensive creeps
        return elvl > 3 ? 3 : elvl;
    }
};

module.exports = globals;
