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

const roomControllersControl = function(room)
{
    for (const id in roomControllers)
    {
        roomControllers[id].control(room);
    }
};

var roomActor =
{
    /**
    @param {Room} room
    **/
    act: function(room)
    {
        {
            const harvesters = room.find(FIND_MY_CREEPS,
                {
                    filter: function(creep)
                    {
                        return creep.memory.hvst;
                    }
                }
            );

            var restockers = false;
            for (var i = 0; i < harvesters.length && !restockers; ++i)
            {
                restockers = harvesters[i].memory.rstk == true;
            }

            globals.loopCache[room.id] = { hasRestockers: restockers };
        }

        // goes first, assigns "dest"
        roomControllersControl(room);

        // goes second, resolves a path
        {
            var creeps = room.find(FIND_MY_CREEPS);

            for (var i = 0; i < creeps.length; ++i)
            {
                // performance loss, but only for small number of access
                var creep = creeps[i];

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
                                if (creep.memory.path)
                                {
                                    keepAssignment = creep.moveByPath(creep.memory.path);
                                }
                                else
                                {
                                    keepAssignment = false;
                                }
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
