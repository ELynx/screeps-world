var globals = require('globals');

var spawnController         = require('controller.spawn');

/**
Order of load is order of call.
**/
var ttlController           = require('controller.ttl');
var energyHarvestController = require('controller.energy.harvest');
var energyRestockController = require('controller.energy.restock');
var buildController         = require('controller.build');
var repairController        = require('controller.repair');
var controllerController    = require('controller.controller');

/**
Clear controllers for next room.
@param {Room} room.
**/
const roomControllersPrepare = function(room)
{
    for (const id in globals.roomControllers)
    {
        globals.roomControllers[id].roomPrepare(room);
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
    const actor = globals.roomControllers[creep.memory.ctrl];

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
    // TODO less obscure logic
    // positive actd is a group effort, do not remember
    if (creep.memory.dact > 0)
    {
        return;
    }

    const controller = globals.roomControllers[creep.memory.ctrl];

    if (controller)
    {
        controller.rememberCreep(creep);
    }
};

/**
Let room controllers do theit jobs.
@param {Room} room.
@param {array<Creep>} creeps.
**/
const roomControllersControl = function(room, creeps)
{
    for (const id in globals.roomControllers)
    {
        creeps = globals.roomControllers[id].control(room, creeps);

        // if all creeps had been taken
        if (creeps.length == 0)
        {
            globals.roomDebug(room, 'All creeps assigned after controller <' + id + '>');
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
        var loopCache = globals.loopCache[room.id] =
        {
            // TODO very cache
            level: globals.roomLevel(room)
        };

        // clear caches, etc
        roomControllersPrepare(room);

        const roomCreeps = room.find(FIND_MY_CREEPS);
        var unassignedCreeps = [];

        {
            // do some statistics
            var assigned   = 0;
            var working    = 0;
            var resting    = 0;
            var moving     = 0;

            // TODO via observe method

            // special for harvers and restock
            var hasRestockers = false;

            for (var i = 0; i < roomCreeps.length; ++i)
            {
                var creep = roomCreeps[i];

                // TODO via observe method

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
                        // actd can be negative, use module
                        if (creep.pos.inRangeTo(destination, Math.abs(creep.memory.dact)))
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

        // separate action based on total creep
        spawnController.controlSpawn(room, roomCreeps);

        if (unassignedCreeps.length > 0)
        {
            roomControllersControl(room, unassignedCreeps);
        }
    } // end of act method
};

module.exports = roomActor;
