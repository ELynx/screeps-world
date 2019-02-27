var globals = require('globals');

/**
Order of load is order of call.
**/

var mapProcess              = require('process.map');
var spawnProcess            = require('process.spawn');

var ttlController           = require('controller.ttl');
var energyHarvestController = require('controller.energy.harvest');
var energyRestockController = require('controller.energy.restock');
var buildController         = require('controller.build');
var repairController        = require('controller.repair');
var controllerController    = require('controller.controller');

/**
Let room processes work.
@param {Room} room.
@param {array<Creep>} creeps.
**/
const roomProcessesWork = function(room, creeps)
{
    for (const id in globals.roomProcesses)
    {
        globals.roomProcesses[id].work(room, creeps);
    }
};

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
Find controller and let it know that creep is aleready in use by it.
@param {Creep} creep.
**/
const roomControllersObserve = function(creep)
{
    const controller = globals.roomControllers[creep.memory.ctrl];

    if (controller)
    {
        controller.observeCreep(creep);
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
        else
        {
            globals.roomDebug(room, 'Creeps left ' + creeps.length);
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

            for (var i = 0; i < roomCreeps.length; ++i)
            {
                var creep = roomCreeps[i];

                if (globals.creepAssigned(creep))
                {
                    // flag if target should be carried to next loop
                    var keepAssignment = false;

                    const destination = globals.creepTarget(creep);

                    if (destination)
                    {
                        if (creep.pos.inRangeTo(destination, creep.memory.dact))
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

                roomControllersObserve(creep);

            } // end of for creeps loop

            // log statistics
            globals.roomDebug(room, 'Assigned creeps ' + assigned);
            globals.roomDebug(room, '-> working      ' + working);
            globals.roomDebug(room, '-> resting      ' + resting);
            globals.roomDebug(room, '-> moving       ' + moving);
            globals.roomDebug(room, 'Free creeps     ' + unassignedCreeps.length);

        } // end of arbitrary scope

        // processes have full creep info
        roomProcessesWork(room, roomCreeps);

        if (unassignedCreeps.length > 0)
        {
            roomControllersControl(room, unassignedCreeps);
        }
    } // end of act method
};

module.exports = roomActor;
