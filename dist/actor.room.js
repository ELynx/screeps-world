'use strict';

var globals = require('globals');

var secutiryProcess          = require('process.security');
var roomInfoProcess          = require('process.roominfo');
var towerProcess             = require('process.tower');
var spawnProcess             = require('process.spawn');
var linkProcess              = require('process.link');
var terminalProcess          = require('process.terminal');
var autobuildProcess         = require('process.autobuild');

/**
Order of load is priority order for creep assignment.
**/
var redAlert                 = require('controller.redalert'); // always on top
var ttlController            = require('controller.ttl'); // catch recyclees
var controllerMineralHarvest = require('controller.mineral.harvest'); // catch miners to mineral
var controllerMineralRestock = require('controller.mineral.restock'); // catch anyone with mineral only
var energyTakeController     = require('controller.energy.take'); // above harvest, decrease harvest work
var energyHarvestController  = require('controller.energy.harvest');
var energyRestockControllerS = require('controller.energy.restock.specialist'); // catch restockers
var energyRestockControllerR = require('controller.energy.restock.regular');
var repairController         = require('controller.repair');
var buildController          = require('controller.build');
var controllerController     = require('controller.controller');

// this one does not register
var grabController           = require('controller.grab');

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
    Find a controller, execute it's act.
    @param {Object} target object.
    @param {Creep} creep.
    @return True if creep was acted upon.
    **/
    roomControllersAct: function(target, creep)
    {
        const controller = globals.roomControllers[creep.memory.ctrl];

        if (controller)
        {
            return controller.act(target, creep) == OK;
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

        secutiryProcess.work(room); // manages threat and safety mode
        roomInfoProcess.work(room); // manages room parameters used by other processes

        towerProcess.work(room);

        // STRATEGY don't execute certain processes too often and on the same tick / all rooms
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

        const roomCreeps = room.getRoomControlledCreeps();
        if (roomCreeps.length > 0)
        {
            // do some statistics
            let spawning = 0;
            let assigned = 0;
            let working  = 0;
            let resting  = 0;
            let moving   = 0;

            for (let i = 0; i < roomCreeps.length; ++i)
            {
                let creep = roomCreeps[i];

                // spawning creep can do nothing
                if (creep.spawning)
                {
                    ++spawning;
                    continue;
                }

                // code that migrate creeps into room of registration
                if (creep.memory.crum != creep.room.name || creep.memory.roomChange)
                {
                    // to take off any work from previous room
                    globals.unassignCreep(creep);

                    // flag to handle border transition
                    creep.memory.roomChange = true;

                    if (creep.fatigue == 0)
                    {
                        // get off border area
                        const offBorderDistance = 23;
                        const destRoom = new RoomPosition(25, 25, creep.memory.crum);

                        if (creep.pos.inRangeTo(destRoom, offBorderDistance))
                        {
                            // drop and forget the flag
                            // not continue, can be used
                            creep.memory.roomChange = undefined;
                        }
                        else
                        {
                            creep.moveToWrapper(destRoom, { reusePath: 50, range: offBorderDistance });
                            ++moving;
                            continue; // to next creep
                        }
                    }
                    else
                    {
                        continue; // to the next creep
                    }
                } // end of subroutine of room change

                // grab logic, manual call
                if (grabController.filterCreep(creep))
                {
                    const currentController = globals.roomControllers[creep.memory.ctrl];

                    const rc = grabController.act(currentController, creep);
                    if (rc == globals.WARN_LAST_INTENT)
                    {
                        globals.unassignCreep(creep);
                    }
                }

                if (globals.creepAssigned(creep))
                {
                    // flag if target should be carried to next loop
                    let keepAssignment = false;

                    const target = creep.target();

                    if (target)
                    {
                        if (creep.pos.inRangeTo(target, creep.memory.dact))
                        {
                            keepAssignment = this.roomControllersAct(target, creep);
                            working = working + keepAssignment;
                        }
                        else
                        {
                            if (creep.getActiveBodyparts(MOVE) == 0)
                            {
                                keepAssignment = false;
                            }
                            else if (creep.fatigue > 0)
                            {
                                keepAssignment = true;
                                ++resting;
                            }
                            else
                            {
                                // STRATEGY creep movement, main CPU sink

                                // first move by cached path
                                let rc = creep.moveToWrapper(target, { noPathFinding: true });

                                // no movement, see if pathfinding is possible
                                if (rc == ERR_NOT_FOUND)
                                {
                                    // percent
                                    const cpuUsed = globals.hardCpuUsed(t0);
                                    if (cpuUsed <= room.memory.cpul)
                                    {
                                        // STRATEGY tweak point for creep movement
                                        rc = creep.moveToWrapper(
                                            target,
                                            {
                                                range: creep.memory.dact,
                                                avoid: room.borderPositions(),
                                                maxRooms: 1
                                            }
                                        );
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
                            } // end of "has MOVE" and "fatigue equals 0"
                        } // end of "not in range"
                    } // end of if target found

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
                else // not creep assigned
                {
                    unassignedCreeps.push(creep);
                }
            } // end of creeps loop

            // log statistics
            this.debugLine(room, 'Busy creeps ' + assigned);
            this.debugLine(room, '-> spawning ' + spawning);
            this.debugLine(room, '-> working  ' + working);
            this.debugLine(room, '-> resting  ' + resting);
            this.debugLine(room, '-> moving   ' + moving);
            this.debugLine(room, 'Free creeps ' + unassignedCreeps.length);
        } // end of roomCreeps

        if (unassignedCreeps.length > 0)
        {
            this.roomControllersControl(room, unassignedCreeps);
        }

        if (globals.hardCpuUsed(t0) <= room.memory.cpul)
        {
            autobuildProcess.work(room);
        }

        if (globals.hardCpuUsed(t0) <= room.memory.cpul)
        {
            terminalProcess.work(room);
        }

        const usedPercent = globals.hardCpuUsed(t0);
        this.debugLine(room, 'HCPU: ' + usedPercent + '% out of assigned ' + room.memory.cpul + '%');
        room.visual.rect(0, 0.25, 5 * usedPercent / 100, 0.25, { fill: '#f00' });
    } // end of act method
};

module.exports = roomActor;
