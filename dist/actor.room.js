'use strict';

var globals = require('globals');

var mapProcess              = require('process.map');
var spawnProcess            = require('process.spawn');

/**
Order of load is priority order for creep assignment.
**/
var ttlController           = require('controller.ttl');
var energyHarvestController = require('controller.energy.harvest');
var energyRestockController = require('controller.energy.restock');
var repairController        = require('controller.repair');
var buildController         = require('controller.build');
var controllerController    = require('controller.controller');

/**
Prepare controllers for next room.
@param {Room} room.
**/
const roomControllersPrepare = function(room)
{
    for (const id in globals.roomControllersPrepare)
    {
        globals.roomControllersPrepare[id].roomPrepare(room);
    }
};

/**
Find controller and let it observe a creep.
@param {Creep} creep.
**/
const roomControllersObserveOwn = function(creep)
{
    const controller = globals.roomControllersObserveOwn[creep.memory.ctrl];

    if (controller)
    {
        controller.observeMyCreep(creep);
    }
};

/**
Let controller see all creeps.
@param {array<Creep>} creeps.
**/
const roomControllersObserveAll = function(creeps)
{
    for (const id in globals.roomControllersObserveAll)
    {
        globals.roomControllersObserveAll[id].observeAllCreeps(creeps);
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
    const controller = globals.roomControllers[creep.memory.ctrl];

    if (controller)
    {
        return controller.act(destination, creep);
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
    Calculate room energy level.
    @param {Room} room.
    @return Energy level of room.
    **/
    roomLevel: function(room)
    {
        if (room.controller && room.controller.my)
        {
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
                if (structs[i].structureType == STRUCTURE_SPAWN)
                {
                    energyCapacity = energyCapacity + 300;
                }

                if (structs[i].structureType == STRUCTURE_EXTENSION)
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

    /**
    @param {Room} room
    **/
    act: function(room)
    {
        // TODO calculate room level less often
        room._level_ = this.roomLevel(room);
        room._debugY_ = undefined;
        room._hasRestockers_ = undefined;

        // arbitrary scope
        {
            roomControllersPrepare(room);
        }
        // end of arbitrary scope

        const roomCreeps = room.find(FIND_MY_CREEPS);
        var unassignedCreeps = [];

        // arbitrary scope
        {
            // do some statistics
            var assigned = 0;
            var working  = 0;
            var resting  = 0;
            var moving   = 0;

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
                        roomControllersObserveOwn(creep);

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
            } // end of creeps loop

            // log statistics
            globals.roomDebug(room, 'Room creeps     ' + roomCreeps.length);
            globals.roomDebug(room, 'Assigned creeps ' + assigned);
            globals.roomDebug(room, '-> working      ' + working);
            globals.roomDebug(room, '-> resting      ' + resting);
            globals.roomDebug(room, '-> moving       ' + moving);
            globals.roomDebug(room, 'Free creeps     ' + unassignedCreeps.length);
        }
        // end of arbitrary scope

        // arbitrary scope
        {
            // manually provide creeps to processes
            mapProcess.work(room);
            spawnProcess.work(room, roomCreeps);

            if (unassignedCreeps.length > 0)
            {
                roomControllersObserveAll(roomCreeps);

                roomControllersControl(room, unassignedCreeps);
            }
        }
        // end of arbitrary scope
    } // end of act method
};

module.exports = roomActor;
