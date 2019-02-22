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
    // to avoid op[] every iteration
    const hasUnassigned = globals.loopCache[room.id].hasUnassigned;

    for (const id in roomControllers)
    {
        const controller = roomControllers[id];

        // if there are free creeps or if controller acts any way
        if (hasUnassigned || controller.actNoCreeps)
        {
            controller.control(room, roomCreeps);
        }
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
            // TODO very cache
            level: globals.roomLevel(room)
        };

        const roomCreeps = room.find(FIND_MY_CREEPS);

        {
            // do some statistics
            var restockers = 0;
            var assigned   = 0;
            var unassigned = 0;

            // TODO once, automated
            var assignments = { };
            assignments[spawnController.id]         = [];
            assignments[energyHarvestController.id] = [];
            assignments[energyRestockController.id] = [];
            assignments[buildController.id]         = [];
            assignments[controllerController.id]    = [];

            for (var i = 0; i < roomCreeps.length; ++i)
            {
                // performance loss, but only for small number of access
                var creep = roomCreeps[i];

                // logic short circuit hopefully
                restockers = restockers || creep.memory.hvst && creep.memory.rstk;

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

                    if (keepAssignment)
                    {
                        assignments[creep.memory.ctrl].push(
                            {
                                targetId:  creep.memory.dest,
                                creepName: creep.name
                            }
                        );
                        ++assigned;
                    }
                    else
                    {
                        globals.unassignCreep(creep);
                        ++unassigned;
                    }
                } // end of creep assigned
                else
                {
                    ++unassigned;
                }
            } // end of for creeps loop

            // cache misc info about creeps
            var loopCache = globals.loopCache[room.id];
            loopCache.hasRestockers = restockers > 0;
            loopCache.hasUnassigned = unassigned > 0;
            loopCache.assignments = assignments;
        } // end of arbitrary scope

        roomControllersControl(room, roomCreeps);
    }
};

module.exports = roomActor;
