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
    },

    /**
    Get number of walkable tiles around a position.
    @param {RoomPosition or GameObject} target.
    @return {integer} number of walkable tiles.
    **/
    walkableTiles: function(target)
    {
        const roomPos = target.pos ? target.pos : target;

        var result = 0;

        const room = Game.rooms[roomPos.roomName];
        if (room)
        {
            const t = roomPos.x > 0  ? roomPos.x - 1 : 0;
            const l = roomPos.y > 0  ? roomPos.y - 1 : 0;
            const b = roomPos.x < 49 ? roomPos.x + 1 : 49;
            const r = roomPos.y < 49 ? roomPos.y + 1 : 49;

            const around = room.lookAtArea(t, l, b, r);

            for (var x in around)
            {
                const ys = around[x];

                for (var y in ys)
                {
                    if (x == roomPos.x && y == roomPos.y)
                    {
                        continue;
                    }

                    const objs = ys[y];

                    if (objs)
                    {
                        var notFound = true;

                        for (var i = 0; i < objs.length && notFound; ++i)
                        {
                            const obj = objs[i];

                            if (obj.type == LOOK_TERRAIN)
                            {
                                if (obj.terrain == 'plain' ||
                                    obj.terrain == 'swamp')
                                {
                                    ++result;
                                    notFound = false;
                                }
                            }

                            if (obj.type == LOOK_STRUCTURES)
                            {
                                if (obj.structure.structureType == STRUCTURE_ROAD)
                                {
                                    ++result;
                                    notFound = false;
                                }
                            }
                        }
                    }
                }
            }
        }

        return result;
    }
};

module.exports = globals;
