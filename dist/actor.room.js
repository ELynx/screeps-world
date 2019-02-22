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

const roomControllerRemember = function(creep)
{
    const actor = roomControllers[creep.memory.ctrl];

    if (actor)
    {
        return actor.rememberCreep(creep);
    }

    return false;
};

const roomControllersControl = function(room, roomCreeps, hasUnassigned)
{
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
        var loopCache = globals.loopCache[room.id] =
        {
            // TODO very cache
            level: globals.roomLevel(room)
        };

        const roomCreeps = room.find(FIND_MY_CREEPS);
        var hasUnassigned = false;

        {
            // special for harvers and restock
            var restockers = false;

            // do some statistics
            var assigned   = 0;
            var working   = 0;
            var resting   = 0;
            var moving    = 0;
            var unassigned = 0;

            for (var i = 0; i < roomCreeps.length; ++i)
            {
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
                            working = working + keepAssignment;
                        }
                        else
                        {
                            if (creep.fatigue > 0)
                            {
                                keepAssignment = true;
                                ++resting;
                            }
                            else
                            {
                                keepAssignment = creep.moveTo(destination) == OK;
                                moving = moving + keepAssignment;
                            }
                        }
                    }

                    if (keepAssignment)
                    {
                        roomControllerRemember(creep);
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

            energyHarvestController.setRestockers(restockers);
            energyRestockController.setRestockers(restockers);

            hasUnassigned = unassigned > 0;
        } // end of arbitrary scope

        roomControllersControl(room, roomCreeps, hasUnassigned);
    }
};

module.exports = roomActor;
