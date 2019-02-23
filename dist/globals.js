var globals =
{
    loopCache: { },

    roomControllers: { },

    verbose: false,

    /**
    Clear debug info cache.
    **/
    debugReset: function()
    {
        if (this.verbose)
        {
            this.loopCache.roomDebug = { };
        }
    },

    /**
    Print a message to room overlay.
    @param {Room} room.
    @param {string} what.
    **/
    roomDebug: function(room, what)
    {
        if (this.verbose)
        {
            var index = this.loopCache.roomDebug[room.id] || 0;

            room.visual.text(what, 40, index++, { align: 'left' });

            this.loopCache.roomDebug[room.id] = index;
        }
    },

    /**
    Add a controller to list of room controllers.
    @param {Controller} controller
    **/
    registerRoomController: function(controller)
    {
        this.roomControllers[controller.id] = controller;
    },

    /**
    Calculate room energy level.
    @param {Room} room.
    @return Energy level of room.
    **/
    roomLevel: function(room)
    {
        if (room.controller && room.controller.my)
        {
            // TODO cache
            const structs = room.find(FIND_MY_STRUCTURES,
                {
                    filter: function(structure)
                    {
                        return structure.isActive() &&
                              (structure.structureType == STRUCTURE_SPAWN ||
                               structure.structureType == STRUCTURE_EXTENSION);
                    }
                }
            );

            var energyCapacity = 0;

            for (var i = 0; i < structs.length; ++i)
            {
                if (structs[i] instanceof StructureSpawn)
                {
                    energyCapacity = energyCapacity + 300;
                }

                if (structs[i] instanceof StructureExtension)
                {
                    energyCapacity = energyCapacity + 50;
                }
            }

            if (energyCapacity >= 800)
            {
                return 3;
            }

            if (energyCapacity >= 550)
            {
                return 2;
            }

            if (energyCapacity >= 300)
            {
                return 1;
            }
        }

        return 0;
    },

    NO_CONTROL: '',
    NO_ACT_DISTANCE: 0,
    NO_DESTINATION: '',

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
        creep.memory.actd = controller.actDistance;
        creep.memory.dest = target.id;
    },

    /**
    Unassign creep from target or controller.
    @param {Creep} creep.
    **/
    unassignCreep: function(creep)
    {
        creep.memory.ctrl = this.NO_CONTROL;
        creep.memory.actd = this.NO_ACT_DISTANCE;
        creep.memory.dest = this.NO_DESTINATION;
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
