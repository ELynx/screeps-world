'use strict';

var globals =
{
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
    Flag to print debug into room visuals.
    **/
    verbose: false,

    /**
    Print a message to room overlay.
    @param {Room} room.
    @param {string} what.
    **/
    roomDebug: function(room, what)
    {
        if (this.verbose)
        {
            var index = room._debugY_ || 0;

            room.visual.text(what, 0, index++, { align: 'left' });

            room._debugY_ = index;
        }
    },

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

    /**
    @param {Creep} creep.
    @return If creep is assigned to a controller.
    **/
    creepAssigned: function(creep)
    {
        return !creep.spawning && creep.memory.ctrl != this.NO_CONTROL;
    },

    /**
    @param {Creep} creep.
    @return If creep is not assigned to a controller.
    **/
    creepNotAssigned: function(creep)
    {
        return !creep.spawning && creep.memory.ctrl == this.NO_CONTROL;
    },

    /**
    Assign creep to a target with controller.
    @param {Controller} controller.
    @param {???} target.
    @param {Creep} creep.
    **/
    assignCreep: function(controller, target, creep)
    {
        creep.memory.ctrl = controller.id;
        creep.memory.dest = target.id;
        creep.memory.dact = controller.actRange;
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
    },

    /**
    @param {Creep} creep.
    @return IGame object creep is targeted to.
    **/
    creepTarget: function(creep)
    {
        return Game.getObjectById(creep.memory.dest);
    }
};

module.exports = globals;
