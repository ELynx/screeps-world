var globals = require('globals');

var spawnController = require('controller.spawn');
var energyHarvestController = require('controller.energy.harvest');
var energyRestockController = require('controller.energy.restock');
var buildController = require('controller.build');
var controllerController = require('controller.controller');

var roomControllers = { };
roomControllers[spawnController.id]         = spawnController;
roomControllers[energyHarvestController.id] = energyHarvestController;
roomControllers[energyRestockController.id] = energyRestockController;
roomControllers[buildController.id]         = buildController;
roomControllers[controllerController.id]    = controllerController;

/**
@param {Object} destination object
@param {Creep} creep
@return True if creep was acted upon
**/
const roomControllersAct = function(destination, creep)
{
    const actor = roomControllers[creep.memory.ctrl];

    if (actor)
    {
        return actor.act(destination, creep);
    }

    return false;
};

const roomControllersControl = function(room, roomCreeps)
{
    for (const id in roomControllers)
    {
        roomControllers[id].control(room, roomCreeps);
    }
};

var roomActor =
{
    /**
    @param {Room} room
    **/
    act: function(room)
    {
        globals.loopCache[room.id] =
        {
            level: globals.roomLevel(room)
        };

        const roomCreeps = room.find(FIND_MY_CREEPS);

        {
            var restockers = false;
            for (var i = 0; i < roomCreeps.length && !restockers; ++i)
            {
                restockers = roomCreeps[i].memory.hvst && roomCreeps[i].memory.rstk;
            }

            globals.loopCache[room.id].hasRestockers = restockers;
        }

        roomControllersControl(room, roomCreeps);

        {
            for (var i = 0; i < roomCreeps.length; ++i)
            {
                // performance loss, but only for small number of access
                var creep = roomCreeps[i];

                // creep has valid destination
                if (globals.creepAssigned(creep))
                {
                    var keepAssignment = false;

                    const destination = globals.creepTarget(creep);

                    if (destination)
                    {
                        if (creep.pos.inRangeTo(destination, creep.memory.actd))
                        {
                            keepAssignment = roomControllersAct(destination, creep);
                        }
                        else
                        {
                            if (creep.fatigue > 0)
                            {
                                keepAssignment = true;
                            }
                            else
                            {
                                keepAssignment = creep.moveTo(destination) == OK;
                            }
                        }
                    }

                    if (!keepAssignment)
                    {
                        globals.unassignCreep(creep);
                    }
                }
            }
        }
    }
};

module.exports = roomActor;
