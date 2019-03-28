'use strict';

var globals = require('globals');

var safemodeProcess         = require('process.safemode');
var mapProcess              = require('process.map');
var towerProcess            = require('process.tower');
var linkProcess             = require('process.link');
var spawnProcess            = require('process.spawn');

/**
Order of load is priority order for creep assignment.
**/
var redAlert                = require('controller.redalert');
var ttlController           = require('controller.ttl');
var energyTakeController    = require('controller.energy.take');
var energyHarvestController = require('controller.energy.harvest');
var energyRestockController = require('controller.energy.restock');
var repairController        = require('controller.repair');
var buildController         = require('controller.build');
var controllerController    = require('controller.controller');

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
        return sources.length;
    },

    /**
    Prepare controllers for next room.
    @param {Room} room.
    **/
    roomControllersPrepare: function(room)
    {
        for (const id in globals.roomControllersPrepare)
        {
            globals.roomControllersPrepare[id].roomPrepare(room);
        }
    },

    /**
    Find controller and let it observe a creep.
    @param {Creep} creep.
    **/
    roomControllersObserveOwn: function(creep)
    {
        const controller = globals.roomControllersObserveOwn[creep.memory.ctrl];

        if (controller)
        {
            controller.observeMyCreep(creep);
        }
    },

    /**
    Let controller see all creeps.
    @param {array<Creep>} creeps.
    **/
    roomControllersObserveAll: function(creeps)
    {
        for (const id in globals.roomControllersObserveAll)
        {
            globals.roomControllersObserveAll[id].observeAllCreeps(creeps);
        }
    },

    /**
    Find a controller, execute it's act.
    @param {Object} destination object.
    @param {Creep} creep.
    @return True if creep was acted upon.
    **/
    roomControllersAct: function(destination, creep)
    {
        const controller = globals.roomControllers[creep.memory.ctrl];

        if (controller)
        {
            return controller.act(destination, creep);
        }

        return false;
    },

    /**
    Let room controllers do theit jobs.
    @param {Room} room.
    @param {array<Creep>} creeps.
    **/
    roomControllersControl: function(room, creeps)
    {
        for (const id in globals.roomControllers)
        {
            creeps = globals.roomControllers[id].control(room, creeps);

            // if all creeps had been taken
            if (creeps.length == 0)
            {
                room.roomDebug('All creeps assigned after controller [' + id + ']');
                return;
            }
            else
            {
                room.roomDebug('Creeps left ' + creeps.length);
            }
        }
    },

    /**
    @param {Room} room
    **/
    act: function(room)
    {
        // mark initial time
        const t0 = Game.cpu.getUsed();

        // clean up controllers
        this.roomControllersPrepare(room);

        // priority - safemode
        const hostileCreeps = room.find(FIND_HOSTILE_CREEPS);
        safemodeProcess.work(room, hostileCreeps);

        // once in a creep life update room info
        if (!room.memory.intl ||
             room.memory.intl < Game.time - 1500)
        {
            room.memory.elvl = this.energyLevel(room);
            room.memory.slvl = this.sourceLevel(room);

            mapProcess.work(room);

            room.memory.intl = Game.time;
        }

        // all creeps registered to room
        const roomCreeps = _.filter(
            Game.creeps,
            function(creep, name)
            {
                return creep.memory.crum == room.name;
            }
        );

        room.roomDebug('Room creeps     ' + roomCreeps.length);

        // not all friendly or own creeps are in roomCreeps, but will do for a time
        towerProcess.work(room, roomCreeps, hostileCreeps);

        // creeps that has no controller assigned will go here
        var unassignedCreeps = [];

        if (roomCreeps.length > 0)
        {
            // do some statistics
            var assigned = 0;
            var working  = 0;
            var resting  = 0;
            var moving   = 0;

            for (var i = 0; i < roomCreeps.length; ++i)
            {
                var creep = roomCreeps[i];

                // code that migrate creeps into room of registration
                if (creep.memory.crum != creep.pos.roomName || creep.memory.roomChange)
                {
                    // to take off any work from previous room
                    globals.unassignCreep(creep);

                    // flag to handle border transition
                    creep.memory.roomChange = true;

                    // TODO only creep with fatugue zero travels border?
                    if (creep.fatigue == 0)
                    {
                        // TODO test range from 0,0 and 49,49 to 25,25
                        // get off border area
                        const destRoom = new RoomPosition(25, 25, creep.memory.crum);
                        const destRange = 23;

                        if (!creep.pos.inRangeTo(destRoom, destRange))
                        {
                            creep.moveTo(destRoom, { reusePath: 50, range: destRange });

                            continue; // to next creep
                        }
                        else
                        {
                            // drop and forget the flag
                            // not continue, can be used
                            creep.memory.roomChange = undefined;
                        }
                    }
                    else
                    {
                        continue; // to the next creep
                    }
                }

                // TODO integrate
                // hotplug - grab resources nearby
                if (creep.sumCarry() < creep.carryCapacity && !creep.memory.manual)
                {
                    var wasGrabbed = false;

                    const res = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1);

                    for (var k = 0; k < res.length && !wasGrabbed; ++k)
                    {
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
                            // since internal to room don't bother with hostile ramparts
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
                            keepAssignment = this.roomControllersAct(destination, creep);
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
                                    // percent
                                    const cpuUsed = globals.hardCpuUsed(t0);

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
                                        room.roomDebug('Creep ' + creep.name + ' stalls');
                                    }
                                }

                                keepAssignment = rc == OK;
                                moving = moving + keepAssignment;
                            }
                        }
                    }

                    if (keepAssignment)
                    {
                        this.roomControllersObserveOwn(creep);

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
            room.roomDebug('Assigned creeps ' + assigned);
            room.roomDebug('-> working      ' + working);
            room.roomDebug('-> resting      ' + resting);
            room.roomDebug('-> moving       ' + moving);
            room.roomDebug('Free creeps     ' + unassignedCreeps.length);
        } // end of roomCreeps

        if (unassignedCreeps.length > 0)
        {
            this.roomControllersObserveAll(roomCreeps);

            this.roomControllersControl(room, unassignedCreeps);
        }

        spawnProcess.work(room, roomCreeps);

        room.roomDebug('HCPU: ' + globals.hardCpuUsed(t0) + '%');

    } // end of act method
};

module.exports = roomActor;
