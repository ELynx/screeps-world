'use strict';

var globals        = require('globals');
var makeDebuggable = require('routine.debuggable');

const profiler = require('screeps-profiler');

Room.prototype._markDefaultFiltered = function()
{
    this._markDefaultFiltered_ = Game.time;
};

Room.prototype._isDefaultFiltered = function()
{
    if (this._markDefaultFiltered_)
    {
        return this._markDefaultFiltered_ == Game.time;
    }

    return false;
};

function Controller(id)
{
    /**
    Unique identifier.
    **/
    this.id = id;

    makeDebuggable(this, 'Controller');

    /**
    Range at which `act` can be used.
    **/
    this.actRange = 1;

    /**
    Max creeps per valid target
    **/
    this.maxCreepsPerTargetPerTick = 1;

    /**
    Extra value stored to creep memory.
    **/
    this.extra = undefined;

    /**
    Flag to check reach-ability of target for creeps during targeting.
    **/
    this.ignoreCreepsForTargeting = true;

    /**
    Cache of target IDs that already have creep assigned.
    **/
    this._excludedTargets = undefined;

    /**
    Clear room target cache.
    **/
    this._prepareExcludedTargets = function(room)
    {
        this._excludedTargets = [];
    };

    /**
    Cache the creep target.
    Duration - room.
    @param {Creep} creep.
    **/
    this._excludeTarget = function(creep)
    {
        this._excludedTargets.push(creep.memory.dest);
    };

    /**
    Filter targets by exclusion.
    @param {array<Object>} targets to filter.
    @return Targets that can be used.
    **/
    this._filterExcludedTargets = function(targets)
    {
        if (targets.length == 0 || this._excludedTargets.length == 0)
        {
            return targets;
        }

        let targetIds = _.map(targets, 'id');
        let exclude   = _.intersection(targetIds, this._excludedTargets);

        if (targets.length == exclude.length)
        {
            return [];
        }

        return _.filter(targets,
            function(target)
            {
                return !_.some(exclude, target.id);
            }
        );
    };

    /**
    Prepare for new room.
    @param {Room} room.
    **/
    this.roomPrepare = undefined;

    /**
    Observe creep that is already controlled.
    @param {Creep} creep.
    **/
    this.observeMyCreep = undefined;

    /**
    Observer every creep controlled by the room.
    Duration - room.
    @param {array<Creep>} creeps.
    **/
    this.observeAllCreeps = undefined;

    /**
    Do something with target and creep then they met.
    @param {Object} target.
    @param {Creep} creep.
    @return If creep should remain on target.
    **/
    this.act = undefined;

    /**
    Targets within room.
    @param {Room} room.
    @return Found targets.
    **/
    this.targets = undefined;

    /**
    Cache of targets per loop per room.
    **/
    this._targetCache = undefined;

    /**
    Caching getter for targets.
    @param {Room} room.
    @return Possible targets.
    **/
    this._findTargets = function(room)
    {
        if (this._targetCache)
        {
            return this._targetCache;
        }

        let targets = this.targets(room);

        if (this._excludedTargets)
        {
            targets = this._filterExcludedTargets(targets);
        }

        this._targetCache = targets;

        return targets;
    };

    /**
    Check if target is take-able.
    **/
    this.validateTarget = undefined;

    this._allAssignedTo = function(target)
    {
        const room = Game.rooms[target.pos.roomName];
        if (room === undefined) return [];

        const roomCreeps = room.getRoomControlledCreeps();
        return _.filter(
            roomCreeps,
            function(creep)
            {
                return creep.memory.ctrl == this.id && creep.memory.dest == target.id;
            },
            this
        );
    };

    this._usesDefaultFilter = undefined;

    /**
    Creep that has some energy and not a specialist.
    @param {Creep} creep to look at.
    @return If creep matches filter.
    **/
    this._defaultFilter = function(creep)
    {
        this._usesDefaultFilter = true;

        if (creep.memory.minr)
        {
            return false;
        }

        return creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
    };

    this._doesDefaultFilter = undefined;

    /**
    Default implementation.
    @param {Creep} creep to look at.
    @return If creep can be used.
    **/
    this.filterCreep = function(creep)
    {
        this._doesDefaultFilter = true;

        return this._defaultFilter(creep);
    };

    this._creepPerTargetSortManhattanClosest = function(target, c1, c2)
    {
        const d1 = Math.abs(target.pos.x - c1.pos.x) + Math.abs(target.pos.y - c1.pos.y);
        const d2 = Math.abs(target.pos.x - c2.pos.x) + Math.abs(target.pos.y - c2.pos.y);

        return d1 - d2;
    };

    this.creepPerTargetSort = function(target, c1, c2)
    {
        return this._creepPerTargetSortManhattanClosest(target, c1, c2);
    };

    /**
    @param {Room} room
    @param {array<Creep>} roomCreeps.
    @return Not assigned creeps.
    **/
    this.assignCreeps = function(room, roomCreeps)
    {
        const targets = this._findTargets(room);

        this.debugLine(room, 'Targets checked ' + targets.length);
        this.debugLine(room, 'Creeps checked  ' + roomCreeps.length);

        let assigned = 0;
        for (let i = 0; i < targets.length; ++i)
        {
            if (roomCreeps.length == 0)
            {
                break; // from target cycle
            }

            const target = targets[i];

            let creeps = roomCreeps.slice(0);
            creeps.sort(
                _.bind(
                    function(c1, c2)
                    {
                        return this.creepPerTargetSort(target, c1, c2);
                    },
                    this
                )
            );

            let takenIds = [];

            for (let j = 0; j < creeps.length; ++j)
            {
                const creep = creeps[j];

                if (this.validateTarget)
                {
                    if (this.validateTarget(target, creep) == false)
                    {
                        continue; // to next creep
                    }
                }

                let assign = false;
                let path   = undefined;

                if (creep.pos.inRangeTo(target.pos, this.actRange))
                {
                    assign = true;
                }
                else
                {
                    const solution = room.findPath(
                        creep.pos,
                        target.pos,
                        globals.moveOptionsWrapper(
                            {
                                ignoreCreeps: this.ignoreCreepsForTargeting,
                                range: this.actRange,
                                maxRooms: 1
                            }
                        )
                    );

                    if (solution.length > 0)
                    {
                        const last = solution[solution.length - 1];
                        const found = target.pos.inRangeTo(last.x, last.y, this.actRange);
                        if (found)
                        {
                            assign = true;
                            path   = solution;
                        }
                    }
                }

                if (assign)
                {
                    const extra = this.extra ? this.extra(target) : undefined;

                    globals.assignCreep(this, target, path, creep, extra);
                    takenIds.push(creep.id);
                }

                if (takenIds.length >= this.maxCreepsPerTargetPerTick)
                {
                    break; // from creep cycle
                }
            } // end of creeps loop

            if (takenIds.length > 0)
            {
                _.remove(
                    roomCreeps,
                    function(creep)
                    {
                        return !_.some(takenIds, creep.id);
                    }
                );

                assigned += takenIds.length;
            }
        }

        this.debugLine(room, 'Creeps assigned ' + assigned);

        return roomCreeps;
    };

    /**
    Default implementation.
    @param {Room} room to control.
    @param {array<Creeps>} roomCreeps to control.
    **/
    this.control = function(room, roomCreeps)
    {
        this.debugHeader(room);

        if (!this.targets)
        {
            this.debugLine('Controller missing targets method!');
            return roomCreeps;
        }

        if (this._usesDefaultFilter)
        {
            if (room._isDefaultFiltered())
            {
                this.debugLine(room, 'Fast exit, no creeps with energy');
                return roomCreeps;
            }
        }

        this._targetCache  = undefined;
        if (this._findTargets(room).length == 0)
        {
            this.debugLine(room, 'Fast exit, no targets');
            return roomCreeps;
        }

        let creepMatch = [];
        let creepSkip  = [];

        for (let i = 0; i < roomCreeps.length; ++i)
        {
            if (this.filterCreep(roomCreeps[i]))
            {
                creepMatch.push(roomCreeps[i]);
            }
            else
            {
                creepSkip.push(roomCreeps[i]);
            }
        }

        if (creepMatch.length == 0)
        {
            if (this._doesDefaultFilter)
            {
                room._markDefaultFiltered();
                this.debugLine(room, 'No creeps with energy found');
            }
            else
            {
                this.debugLine(room, 'No creeps found');
            }

            return roomCreeps;
        }

        // remainder returned
        creepMatch = this.assignCreeps(room, creepMatch);

        if (creepMatch.length > 0)
        {
            return creepSkip.concat(creepMatch);
        }
        else
        {
            if (this._doesDefaultFilter)
            {
                room._markDefaultFiltered();
                this.debugLine(room, 'All creeps with energy are used');
            }

            return creepSkip;
        }
    };

    /**
    Register into globals.
    **/
    this.register = function()
    {
        globals.registerRoomController(this);

        profiler.registerObject(this, this.id);
    };
};

module.exports = Controller;
