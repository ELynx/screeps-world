'use strict';

var globals = require('globals');

var makeCaveMap              = require('routine.map');

var secutiryProcess          = require('process.security');
var towerProcess             = require('process.tower');
var linkProcess              = require('process.link');
var spawnProcess             = require('process.spawn');

/**
Order of load is priority order for creep assignment.
**/
var redAlert                 = require('controller.redalert');
var ttlController            = require('controller.ttl');
var energyTakeController     = require('controller.energy.take');
var energyHarvestController  = require('controller.energy.harvest');
var energyRestockControllerR = require('controller.energy.restock.regular');
var energyRestockControllerS = require('controller.energy.restock.specialist');
var repairController         = require('controller.repair');
var buildController          = require('controller.build');
var controllerController     = require('controller.controller');
var controllerMineralHarvest = require('controller.mineral.harvest');
var controllerMineralRestock = require('controller.mineral.restock');

var roomActor =
{
    verbose: false,

    debugLine: function(room, what)
    {
        if (this.verbose)
        {
            room.roomDebug(what);
        }
    },

    /**
    Calculate room energy level.
    @param {Room} room.
    @return Energy level of room.
    **/
    energyLevel: function(room, roomCreeps)
    {
        const structs = room.find(FIND_MY_STRUCTURES,
            {
                filter: function(structure)
                {
                    return (structure.structureType == STRUCTURE_SPAWN ||
                            structure.structureType == STRUCTURE_EXTENSION) &&
                            structure.isActive();
                }
            }
        );

        let energyCapacity = 0;
        let hasSpawn = false;

        for (let i = 0; i < structs.length; ++i)
        {
            energyCapacity = energyCapacity + structs[i].energyCapacity;
            hasSpawn = hasSpawn || structs[i].structureType == STRUCTURE_SPAWN;
        }

        // probably some edge case of war
        if (!hasSpawn)
        {
            return 0;
        }

        // has spawn, has no creeps, means creeps wiped
        if (roomCreeps.length == 0)
        {
            // still can try to spawn weaklings
            return 1;
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

        return 0;
    },

    /**
    Calculate room source level.
    @param {Room} room.
    @return Source level of room.
    **/
    sourceLevel: function(room)
    {
        let walkable = 0;

        const sources = room.find(FIND_SOURCES);
        for (let i = 0; i < sources.length; ++i)
        {
            walkable = walkable + sources[i].pos.walkableTiles();
        }

        return walkable;
    },

    /**
    Calculate room mining level.
    @param {Room} room.
    @return Mining level of room.
    **/
    miningLevel: function(room)
    {
        const extractors = room.find(
            FIND_MY_STRUCTURES,
            {
                filter: function(structure)
                {
                    return structure.structureType == STRUCTURE_EXTRACTOR && structure.isActive();
                }
            }
        );

        // real cheap here, integrate
        const minerals = room.find(
            FIND_MINERALS,
            {
                filter: function(mineral)
                {
                    return mineral.mineralAmount > 0;
                }
            }
        );

        const terminals = room.find(
            FIND_MY_STRUCTURES,
            {
                filter: function(structure)
                {
                    return structure.structureType == STRUCTURE_TERMINAL && structure.isActive();
                }
            }
        );

        return (extractors.length > 0 && terminals.length > 0 && minerals.length > 0) ? 1 : 0;
    },

    wallLevel: function(room)
    {
        const walls = room.find(
            FIND_STRUCTURES,
            {
                filter: function(structure)
                {
                    return structure.structureType == STRUCTURE_WALL;
                }
            }
        );

        if (walls.length == 0)
        {
            return 0;
        }

        const totalHp = 0;

        for (let i = 0; i < walls.length; ++i)
        {
            totalHp = totalHp + Math.floor(walls[i].hits / 1000);
        }

        return Math.floor(totalHp / walls.length);
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
                this.debugLine(room, 'All creeps assigned after controller [' + id + ']');
                return;
            }
            else
            {
                this.debugLine(room, 'Creeps left ' + creeps.length);
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
        secutiryProcess.work(room, hostileCreeps);

        // all creeps registered to room
        const roomCreeps = _.filter(
            Game.creeps,
            function(creep, name)
            {
                return creep.memory.crum == room.name;
            }
        );

        // once in a creep life update room info
        if (room.memory.intl === undefined ||
            room.memory.intl < Game.time - 1500)
        {
            room.memory.elvl = this.energyLevel(room, roomCreeps);
            room.memory.slvl = this.sourceLevel(room);
            room.memory.mlvl = this.miningLevel(room);
            room.memory.wlvl = this.wallLevel(room);

            // from level 6 sometimes add a thousand
            if (room.memory.elvl > 5)
            {
                if (Math.random() < 0.1)
                {
                    ++room.memory.wlvl;
                }
            }

            makeCaveMap(room);

            // TODO get rid of hardcode
            const flagName = 'strelok_' + room.name;

            let flag = Game.flags[flagName];
            if (flag)
            {
                const patrolUnits = Math.min(3, room.memory.elvl + 1);
                flag.setValue(patrolUnits);
            }
            else
            {
                // TODO at the "downtown"
                const flagPos = new RoomPosition(25, 25, room.name);
                // TODO setValue(1)
                // new room info, start with single guard
                flagPos.createFlag(flagName, COLOR_GREEN);
            }

            // offset regeneration time randomly so multiple roooms don't do it at same turm
            room.memory.intl = Game.time + Math.ceil(Math.random() * 42);
        }

        this.debugLine(room, 'Room creeps     ' + roomCreeps.length);

        // not all friendly or own creeps are in roomCreeps, but will do for a time
        towerProcess.work(room, roomCreeps, hostileCreeps);

        // STRATEGY don't execute certain processes too ofthen
        let processKey = (room.memory.intl + Game.time) % 10;

        if (processKey == 0)
        {
            spawnProcess.work(room, roomCreeps);
        }
        else if (processKey == 5)
        {
            linkProcess.work(room);
        }

        // creeps that has no controller assigned will go here
        let unassignedCreeps = [];

        if (roomCreeps.length > 0)
        {
            // do some statistics
            let assigned = 0;
            let working  = 0;
            let resting  = 0;
            let moving   = 0;

            for (let i = 0; i < roomCreeps.length; ++i)
            {
                let creep = roomCreeps[i];

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

                        if (!creep.pos.inRangeTo(destRoom, 23))
                        {
                            creep.moveTo(destRoom, { reusePath: 50, range: 23 });

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
                } // end of loop of room change

                // TODO integrate
                // TODO profile and decide how it works
                // hotplug - grab resources nearby
                if (creep.sumCarry() < creep.carryCapacity &&
                  !(creep.memory.rstk && creep.memory.ctrl == energyHarvestController.id))
                {
                    let wasGrabbed = false;

                    const res = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1);

                    for (let k = 0; k < res.length && !wasGrabbed; ++k)
                    {
                        if (res[k].resourceType == RESOURCE_ENERGY)
                        {
                            wasGrabbed = creep.pickup(res[k]) == OK;
                        }
                    }

                    if (!wasGrabbed)
                    {
                        const tomb = creep.pos.findInRange(FIND_TOMBSTONES, 1);

                        for (let k = 0; k < tomb.length && !wasGrabbed; ++k)
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
                } // end of grab logic

                if (globals.creepAssigned(creep))
                {
                    // flag if target should be carried to next loop
                    let keepAssignment = false;

                    const destination = creep.target();

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
                                let rc = creep.moveTo(destination, { noPathFinding: true });

                                // no movement, see if pathfinding is possible
                                if (rc == ERR_NOT_FOUND)
                                {
                                    // percent
                                    const cpuUsed = globals.hardCpuUsed(t0);

                                    // TODO other operations take CPU too
                                    if (cpuUsed <= room.memory.cpul)
                                    {
                                        // STRATEGY tweak point for creep movement
                                        rc = creep.moveTo(destination, { plainCost: 1, maxRooms: 1, range: creep.memory.dact });
                                    }
                                    else
                                    {
                                        // so assignment is not dropped
                                        rc = OK;
                                        this.debugLine(room, 'Creep ' + creep.name + ' stalls');
                                        creep.say('P');
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
            this.debugLine(room, 'Assigned creeps ' + assigned);
            this.debugLine(room, '-> working      ' + working);
            this.debugLine(room, '-> resting      ' + resting);
            this.debugLine(room, '-> moving       ' + moving);
            this.debugLine(room, 'Free creeps     ' + unassignedCreeps.length);
        } // end of roomCreeps

        if (unassignedCreeps.length > 0)
        {
            this.roomControllersObserveAll(roomCreeps);

            this.roomControllersControl(room, unassignedCreeps);
        }

        this.debugLine(room, 'HCPU: ' + globals.hardCpuUsed(t0) + '%');

    } // end of act method
};

module.exports = roomActor;
