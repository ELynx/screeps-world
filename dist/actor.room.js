var globals = require('globals');

var spawnController         = require('controller.spawn');
var energyHarvestController = require('controller.energy.harvest');
var energyRestockController = require('controller.energy.restock');
var buildController         = require('controller.build');
var controllerController    = require('controller.controller');

var roomControllers = { };
roomControllers[spawnController.id]         = spawnController;
roomControllers[energyHarvestController.id] = energyHarvestController;
roomControllers[energyRestockController.id] = energyRestockController;
roomControllers[buildController.id]         = buildController;
roomControllers[controllerController.id]    = controllerController;

/**
Clear controllers for next room.
**/
const roomControllersPrepare = function()
{
    for (const id in roomControllers)
    {
        roomControllers[id].roomPrepare();
    }
};

/**
Find a controller, execute it's act.
@param {Object} destination object.
@param {Creep} creep.
@return True if creep was acted upon.
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

/**
Find controller and let it know that creep is aleready in use by it.
@param {Creep} creep.
**/
const roomControllerRemember = function(creep)
{
    const controller = roomControllers[creep.memory.ctrl];

    if (controller)
    {
        controller.rememberCreep(creep);
    }
};

/**
Let room controllers do theit jobs.
@param {Room} room.
@param {array<Creep>} creeps.
@param {boolean} hasUnassigned.
**/
const roomControllersControl = function(room, creeps)
{
    for (const id in roomControllers)
    {
        roomControllers[id].control(room, creeps);

        // if all creeps had been taken
        if (creeps.length == 0)
        {
            return;
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
        // clear caches, etc
        roomControllersPrepare();

        var loopCache = globals.loopCache[room.id] =
        {
            // TODO very cache
            level: globals.roomLevel(room)
        };

        const roomCreeps = room.find(FIND_MY_CREEPS);
        var unassignedCreeps = [];

        {
            // do some statistics
            var assigned   = 0;
            var working    = 0;
            var resting    = 0;
            var moving     = 0;

            // special for harvers and restock
            var hasRestockers = false;

            for (var i = 0; i < roomCreeps.length; ++i)
            {
                var creep = roomCreeps[i];

                // special logic section

                // check for creeps that can do restocking
                hasRestockers = hasRestockers || creep.memory.hvst && creep.memory.rstk == true;

                // check and remember creeps that can be restocked
                if (creep.memory.hvst && creep.memory.rstk == false)
                {
                    energyRestockController.rememberRestockable(creep);
                }

                // common workflow section

                if (globals.creepAssigned(creep))
                {
                    // flag if target should be carried to next loop
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
                        unassignedCreeps.push(creep);
                    }
                } // end of creep assigned
                else
                {
                    unassignedCreeps.push(creep);
                }
            } // end of for creeps loop

            // personal for these controllers
            energyHarvestController.setHasRestockers(hasRestockers);
            energyRestockController.setHasRestockers(hasRestockers);
        } // end of arbitrary scope

        // log statistics
        globals.roomDebug(room, 'Assigned creeps ' + assigned);
        globals.roomDebug(room, '-> working      ' + working);
        globals.roomDebug(room, '-> resting      ' + resting);
        globals.roomDebug(room, '-> moving       ' + moving);
        globals.roomDebug(room, 'Free creeps     ' + unassignedCreeps.length);

        // separate action based on total creep #
        spawnController.controlSpawn(room, roomCreeps);

        if (unassignedCreeps.length > 0)
        {
            roomControllersControl(room, unassignedCreeps);
        }
    } // end of act method
};

module.exports = roomActor;
