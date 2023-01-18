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
    Extra value stored to creep memory.
    **/
    this.extra = undefined;

    /**
    Flag to check reach-ability of target for creeps during targeting.
    **/
    this.ignoreCreepsForTargeting = true;

    /**
    Flag to focus creep actions.
    **/
    this.focusEffort = false;

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
    TODO rename
    Targets within room.
    @param {Room} room.
    @return Found  static targets.
    **/
    this.staticTargets = undefined;

    /**
    Cache of static targets per loop per room.
    **/
    this._staticTargetCache = undefined;

    /**
    Caching getter for static targets.
    @param {Room} room.
    @return Possible static targets.
    **/
    this._findStaticTargets = function(room)
    {
        if (this._staticTargetCache)
        {
            return this._staticTargetCache;
        }

        let targets = this.staticTargets(room);

        if (this._excludedTargets)
        {
            targets = this._filterExcludedTargets(targets);
        }

        this._staticTargetCache = targets;

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

    /**
    Default implementation.
    @param {Room} room
    @param {array<Creep>} creeps.
    @return Not assigned creeps.
    **/
    this.assignCreeps = function(room, creeps)
    {
        const checked = creeps.length;
        let assigned = 0;

        for (let i = 0; i < creeps.length;)
        {
            const creep = creeps[i];

            // all suitable targets
            // TODO rotation point
            const targets = this._findStaticTargets(room);

            // starting with closest, Manhattan distance is "good enough"
            targets.sort(
                _.bind(
                    function(t1, t2)
                    {
                        const d1 = Math.abs(creep.pos.x - t1.pos.x) + Math.abs(creep.pos.y - t1.pos.y);
                        const d2 = Math.abs(creep.pos.x - t2.pos.x) + Math.abs(creep.pos.y - t2.pos.y);

                        if (d1 == d2 && this.tiebreaker)
                        {
                            return this.tiebreaker(t1, t2);
                        }

                        return d1 - d2;
                    },
                    this
                )
            );

            // of them one that can be reached
            let target = undefined;
            let targetMove = undefined;

            // check, see if reacheable in any way
            for (let j = 0; j < targets.length; ++j)
            {
                if (this.validateTarget)
                {
                    if (this.validateTarget(targets[j], creep) == false)
                    {
                        continue; // to another target
                    }
                }

                const inspected = targets[j].pos;

                if (inspected.inRangeTo(creep.pos, this.actRange))
                {
                    target = targets[j];
                    break; // from targets loop
                }

                const solution = room.findPath(
                    creep.pos,
                    inspected,
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
                    const found = inspected.inRangeTo(last.x, last.y, this.actRange);

                    if (found)
                    {
                        target = targets[j];
                        targetMove = solution;
                        break; // from targets loop
                    }
                }
            } // end of targets loop

            if (target)
            {
                const extra = this.extra ? this.extra(target) : undefined;

                globals.assignCreep(this, target, targetMove, creep, extra);
                creeps.splice(i, 1);

                ++assigned;

                continue;
            }

            ++i;
        }

        this.debugLine(room, 'Creeps checked  ' + checked);
        this.debugLine(room, 'Creeps assigned ' + assigned);

        return creeps;
    };

    /**
    Default implementation.
    @param {Room} room to control.
    @param {array<Creeps>} roomCreeps to control.
    **/
    this.control = function(room, roomCreeps)
    {
        this.debugHeader(room);

        if (!this.staticTargets)
        {
            this.debugLine('Controller missing targets!');
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

        this._staticTargetCache  = undefined;
        const statics = this._findStaticTargets(room);
        if (statics.length == 0)
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
