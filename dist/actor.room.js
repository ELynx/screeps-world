'use strict';

var globals = require('globals');

var secutiryProcess          = require('process.security');
var roomInfoProcess          = require('process.roominfo');
var towerProcess             = require('process.tower');
var linkProcess              = require('process.link');
var spawnProcess             = require('process.spawn');
var terminalProcess          = require('process.terminal');

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
                this.debugLine(room, 'Creeps left after controller [' + id + ']: ' + creeps.length);
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
        secutiryProcess.work(room);
        roomInfoProcess.work(room);
        towerProcess.work(room);

        // STRATEGY don't execute certain processes too ofthen
        const processKey = (room.memory.intl + Game.time) % 10;

        if (processKey == 0)
        {
            spawnProcess.work(room);
        }
        else if (processKey == 5)
        {
            linkProcess.work(room);
        }

        // creeps that has no controller assigned will go here
        let unassignedCreeps = [];

        let roomCreeps = room.getRoomControlledCreeps();
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
                        // get off border area
                        const destRoom = new RoomPosition(25, 25, creep.memory.crum);

                        if (!creep.pos.inRangeTo(destRoom, 23))
                        {
                            creep.moveToWrapper(destRoom, { reusePath: 50, range: 23 });

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
                // TODO why these conditions?
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

                    if (!wasGrabbed)
                    {
                        const ruin = creep.pos.findInRange(FIND_RUINS, 1);
                        for (let k = 0; k < ruin.length && !wasGrabbed; ++k)
                        {
                            wasGrabbed = creep.withdraw(ruin[k], RESOURCE_ENERGY) == OK;
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
                                let rc = creep.moveToWrapper(destination, { noPathFinding: true });

                                // no movement, see if pathfinding is possible
                                if (rc == ERR_NOT_FOUND)
                                {
                                    // percent
                                    const cpuUsed = globals.hardCpuUsed(t0);

                                    // TODO other operations take CPU too
                                    if (cpuUsed <= room.memory.cpul)
                                    {
                                        // STRATEGY tweak point for creep movement
                                        rc = creep.moveToWrapper(destination, { maxRooms: 1, range: creep.memory.dact });
                                    }
                                    else
                                    {
                                        // so assignment is not dropped
                                        rc = OK;
                                        this.debugLine(room, 'Creep ' + creep.name + ' stalls');
                                        creep.say('(P)');
                                    }
                                }

                                keepAssignment = rc == OK;
                                moving = moving + keepAssignment;
                            } // end of fatigue equals 0
                        } // end of "not in range"
                    } // end of if destination found

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

        // percent
        if (globals.hardCpuUsed(t0) <= room.memory.cpul)
        {
            terminalProcess.work(room);
        }

        this.debugLine(room, 'HCPU: ' + globals.hardCpuUsed(t0) + '% out of assigned ' + room.memory.cpul + '%');

    } // end of act method
};

module.exports = roomActor;
