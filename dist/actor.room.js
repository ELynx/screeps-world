'use strict';

var globals = require('globals');

var mapProcess              = require('process.map');
var spawnProcess            = require('process.spawn');
var psychoWarfare           = require('actor.psychowarfare');

/**
Order of load is priority order for creep assignment.
**/
var redAlert                = require('controller.redalert');
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
            globals.roomDebug(room, 'All creeps assigned after controller [' + id + ']');
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
    energyLevel: function(room)
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
                // above 800 (aka full built RCL 3) go in increments of 500
                return Math.floor((energyCapacity - 799) / 500) + 3;
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
    Calculate room source level.
    @param {Room} room.
    @return Source level of room.
    **/
    sourceLevel: function(room)
    {
        const sources = room.find(FIND_SOURCES);

        var total = 0;
        for (var i = 0; i < sources.length; ++i)
        {
            total = total + globals.walkableTiles(sources[i]);
        }

        return total;
    },

    /**
    @param {Room} room
    **/
    act: function(room)
    {
        // t0 time mark
        const cpuZero = Game.cpu.getUsed();

        if (!room.memory.intl ||
             room.memory.intl < Game.time - 1500)
        {
            room.memory.elvl = this.energyLevel(room);
            room.memory.slvl = this.sourceLevel(room);

            room.memory.intl = Game.time;
        }

        room._debugY_ = undefined;
        room._hasRestockers_ = undefined;
        room._hasEnergetic_ = undefined;
        room._damaged_ = [];

        // arbitrary scope
        {
            roomControllersPrepare(room);
        }
        // end of arbitrary scope

        var roomCreeps = [];
        var unassignedCreeps = [];

        // arbitrary scope
        {
            // do some statistics
            var assigned = 0;
            var working  = 0;
            var resting  = 0;
            var moving   = 0;

            for (const name in Game.creeps)
            {
                var creep = Game.creeps[name];

                if (creep.memory.crum == room.name)
                {
                    roomCreeps.push(creep);
                }
                else
                {
                    continue;
                }

                if (creep.memory.crum != creep.pos.roomName || creep.memory.roomChange)
                {
                    globals.unassignCreep(creep);

                    creep.memory.roomChange = true;

                    const destRoom = new RoomPosition(25, 25, creep.memory.crum);

                    if (creep.fatigue == 0)
                    {
                        const destRange = 23;

                        if (!creep.pos.inRangeTo(destRoom, destRange))
                        {
                            creep.moveTo(destRoom, { reusePath: 50, range: destRange });
                        }
                        else
                        {
                            creep.memory.roomChange = undefined;
                        }
                    }

                    continue;
                }

                if (creep.hits < creep.hitsMax)
                {
                    room._damaged_.push(creep);
                }

                creep._cidx_ = undefined;
                creep._sumcarry_ = _.sum(creep.carry);

                // TODO integrate
                // hotplug - grab resources nearby
                if (creep._sumcarry_ < creep.carryCapacity && !creep.memory.manual)
                {
                    var wasGrabbed = false;

                    const res = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1);

                    for (var k = 0; k < res.length && !wasGrabbed; ++k)
                    {
                        // TODO all resources, now only energy since other breaks harvest logic
                        if (res[k].resourceType == RESOURCE_ENERGY)
                        {
                            wasGrabbed = creep.pickup(res[k]) == OK;
                        }
                    }

                    if (!wasGrabbed)
                    {
                        const tomb = creep.pos.findInRange(FIND_TOMBSTONES, 1);

                        for (var k = 0; k < tomb.length && !wasGrabbed; ++k)
                        {
                            // TODO on hostile tomb on hostile rampart
                            // TODO all resources, now only energy since other breaks harvest logic
                            wasGrabbed = creep.withdraw(tomb[k], RESOURCE_ENERGY) == OK;
                        }
                    }

                    if (wasGrabbed)
                    {
                        // TODO integrate
                        // hotplug 2 - don't go with harvest
                        if (creep.memory.ctrl == energyHarvestController.id)
                        {
                            globals.unassignCreep(creep);
                        }
                    }
                }

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
                                // STRATEGY creep movement, main CPU sink

                                // first move by cached path
                                var rc = creep.moveTo(destination, { noPathFinding: true });

                                // no movement, see if pathfinding is possible
                                if (rc == ERR_NOT_FOUND)
                                {
                                    // from hard limit, try to fill in bucket; precent for simplicity
                                    const cpuUsed = globals.hardCpuUsed(cpuZero);

                                    // TODO room limit
                                    // TODO other operations take CPU too
                                    if (cpuUsed < 40)
                                    {
                                        // STRATEGY tweak point for creep movement
                                        rc = creep.moveTo(destination, { maxRooms: 1, range: creep.memory.dact });
                                    }
                                    else
                                    {
                                        // so assignment is not dropped
                                        rc = OK;
                                        globals.roomDebug(room, 'Creep ' + creep.name + ' stalls');
                                    }
                                }

                                keepAssignment = rc == OK;
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

        // hotplug
        // <<
        /*{
            if (room.name == 'E39N1')
            {
                const spawns = room.find(FIND_MY_SPAWNS);

                if (spawns.length < 1)
                {
                    // move back to renew
                    for (var i = 0; i < roomCreeps.length; ++i)
                    {
                        if (roomCreeps[i].ticksToLive < 150)
                        {
                            roomCreeps[i].memory.crum = 'E38N1';
                        }
                    }

                    // steal creeps
                    if (roomCreeps.length < 4)
                    {
                        for (const name in Game.creeps)
                        {
                            var creep = Game.creeps[name];

                            if (creep.ticksToLive > 1200 &&
                                creep.memory.btyp == 0 &&
                                !globals.creepAssigned(creep))
                            {
                                Game.creeps[name].memory.crum = 'E39N1';
                                break;
                            }
                        }
                    }

                }
            }
        }*/
        // >>

        // arbitrary scope
        {
            // manually provide creeps to processes
            mapProcess.work(room);
            spawnProcess.work(room, roomCreeps);
            //psychoWarfare.act(roomCreeps);

            if (unassignedCreeps.length > 0)
            {
                roomControllersObserveAll(roomCreeps);

                roomControllersControl(room, unassignedCreeps);
            }
        }
        // end of arbitrary scope

        globals.roomDebug(room, 'HCPU: ' + globals.hardCpuUsed(cpuZero) + '%');

    } // end of act method
};

module.exports = roomActor;
