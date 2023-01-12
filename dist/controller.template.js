'use strict';

var globals = require('globals');
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

    // attach methods that allow fast debug writing
    makeDebuggable(this, 'Controller');

    /**
    Range at which `act` can be used.
    **/
    this.actRange = 1;

    /**
    Extra value set at start and used by `act'.
    **/
    this.extra = undefined;

    /**
    Flag to check reach-ability of target for creeps during targeting.
    **/
    this.ignoreCreepsForTargeting = true;

    /**
    Flag to focus creeps on one target in room.
    For dynamic targets.
    **/
    this.focusDynamic = false;

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
    Prepare for new room.
    @param {Room} room.
    **/
    this.roomPrepare = undefined;

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
    When target is filtered out excluded target list is reduced.
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
        let exclude = _.intersection(targetIds, this._excludedTargets);

        if (exclude.length == this._excludedTargets.length)
        {
            this._excludedTargets = [];
        }
        else
        {
            this._excludedTargets = _.difference(this._excludedTargets, exclude);
        }

        if (targets.length == exclude.length)
        {
            return [];
        }

        return _.filter(targets,
            function(target)
            {
                return _.indexOf(exclude, target.id) == -1;
            }
        );
    };

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
    Static means same targets returned every time.
    @param {Room} room.
    @return Found  static targets.
    **/
    this.staticTargets = undefined;

    /**
    Cache of static targets per loop per room.
    **/
    this._staticTargetCache = undefined;

    /**
    Targets within room, partial search.
    Dynamic means different targets may be found each call.
    @param {Room} room.
    @return Found dynamic targets.
    **/
    this.dynamicTargets = undefined;

    this._dynamicTargetCache = undefined;

    /**
    Search room using cave logic.
    @param {Room} room.
    @param {LOOK_*} lookForType.
    @param {function} filter.
    @param {integer} caveIndex to limit search to single cave cell
    @return Found targets.
    **/
    this._lookInCave = function(room, lookForType, filter, caveIndex)
    {
        if (this._dynamicTargetCache)
        {
            const caveCache = this._dynamicTargetCache[caveIndex];

            if (caveCache)
            {
                return caveCache;
            }
        }

        const xSize = room.memory.caveMap[0].length - 1;
        const caveX = caveIndex % xSize;
        const caveY = Math.floor(caveIndex / xSize);

        if (/*caveX < room.memory.caveMap[0].length - 1 &&*/ // always true
            caveY < room.memory.caveMap[1].length - 1)
        {
            const l = room.memory.caveMap[0][caveX];
            const r = room.memory.caveMap[0][caveX + 1] - 1;
            const t = room.memory.caveMap[1][caveY];
            const b = room.memory.caveMap[1][caveY + 1] - 1;

            const looked = room.lookForAtArea(lookForType, t, l, b, r);

            let targets = [];

            for (let x in looked)
            {
                const ys = looked[x];

                for (let y in ys)
                {
                    const objs = ys[y];

                    if (objs)
                    {
                        for (let i = 0; i < objs.length; ++i)
                        {
                            if (filter(objs[i]))
                            {
                                targets.push(objs[i]);
                            }
                        }
                    }
                }
            }

            // filter cave individually
            if (this._excludedTargets)
            {
                targets = this._filterExcludedTargets(targets);
            }

            // one target per cave if flag is set
            if (this.focusDynamic && targets.length > 1)
            {
                targets.splice(1);
            }

            if (!this._dynamicTargetCache)
            {
                this._dynamicTargetCache = { };
            }

            this._dynamicTargetCache[caveIndex] = targets;

            return targets;
        }

        return [];
    };

    /**
    Search for targets starting from creep cave.
    Limit output to single cave to prevent too much pathfinding.
    **/
    this._lookAroundCreep = function(room, lookForType, filter, creep)
    {
        // TODO cave navigation

        const Magic =
        [
        [ 0,  1,  5,  6,  2, 10,  7, 11, 12,  3, 15,  8, 16, 13, 17, 18,  4, 20,  9, 21, 14, 22, 19, 23, 24],
        [ 1,  6,  2,  0,  7,  5,  3, 11, 10, 12, 15, 16, 17, 20, 21,  8, 13, 18, 22, 23,  4,  9, 14, 19, 24],
        [ 2,  1,  3,  7,  8,  6, 12,  4,  0,  9,  5, 13, 11, 17, 14, 10, 18, 16, 22, 23, 21, 19, 15, 24, 20],
        [ 3,  2,  4,  8,  9,  7, 14, 13, 12, 18,  1, 19, 24, 23, 17,  6, 11,  0,  5, 16, 10, 22, 15, 21, 20],
        [ 4,  3,  9,  8,  2, 14,  7, 13, 12,  1, 19,  6, 18, 24, 17, 11, 16, 23, 22, 21,  0,  5, 10, 15, 20],
        [ 5,  6,  0, 10,  1, 11,  2,  7, 12, 15, 16, 17, 20,  8,  3, 13, 18, 21, 22, 23,  4,  9, 14, 19, 24],
        [ 6,  0,  1,  5,  2, 10,  7, 11, 12,  3, 15,  8, 16, 13, 17, 18,  4, 20,  9, 21, 14, 19, 22, 23, 24],
        [ 7,  2, 12,  8,  6,  3, 11,  1, 13,  9,  5, 17,  4,  0, 14, 10, 16, 18, 22, 19, 15, 21, 23, 20, 24],
        [ 8,  4,  3,  9,  7, 13,  2, 14, 12, 18,  6,  1, 19, 17, 24, 11, 23, 16, 22, 21,  0,  5, 10, 15, 20],
        [ 9,  4, 14,  8,  3, 13,  7, 19,  2,  1, 12,  6, 18, 11, 17, 16, 24, 23, 22, 21,  0,  5, 10, 15, 20],
        [10, 11,  5, 15,  6, 16,  0, 20,  1, 21, 12,  7, 17,  2, 22, 13,  8, 18,  3, 23, 14,  9, 19,  4, 24],
        [11, 10, 12,  6, 16,  5,  7, 15, 17,  1, 21, 13,  0, 20,  2, 22,  8, 18, 14,  3, 23,  9, 19,  4, 24],
        [12, 11, 13,  7, 17,  6,  8, 16, 18,  2, 22, 14, 10,  5,  1,  3,  9, 19, 23, 21, 15,  0,  4, 24, 20],
        [13, 14, 12,  8, 18,  9, 19,  7, 17,  3, 23, 24,  4,  2, 22, 11,  6, 16, 10,  1, 21,  0,  5, 15, 20],
        [14,  9, 19, 13,  8, 18,  4, 24,  3, 23, 12,  7, 17, 11,  2, 22,  6, 16,  1, 21, 10,  5, 15,  0, 20],
        [15, 10, 20, 16, 11, 21,  5, 17, 22, 23, 24, 12,  6,  0, 18,  1,  7, 13, 19,  2,  8, 14,  3,  9,  4],
        [16, 15, 17, 21, 11, 20, 22, 10, 12,  6, 18, 23,  5,  7, 13,  0, 24,  1, 19,  8,  2, 14,  3,  9,  4],
        [17, 22, 12, 16, 18, 11, 13, 21, 23,  7, 15, 19, 20, 24, 10, 14,  6,  8,  2,  5,  9,  1,  3,  0,  4],
        [18, 19, 17, 12, 23, 24, 14, 22, 12,  8, 16, 21,  9, 11,  7,  6, 15,  3,  4, 20, 10,  2,  5,  1,  0],
        [19, 24, 14, 18, 13, 23, 17,  9, 22,  8, 12,  7, 16, 21, 11,  6,  4, 20, 15,  2,  5,  1,  0,  3, 10],
        [20, 15, 21, 16, 10, 22, 11, 17,  5,  6, 12, 18, 23,  0,  1,  7, 13, 19, 24,  2,  8, 14,  3,  9,  4],
        [21, 20, 22, 16, 15, 17, 11, 23, 10,  5, 12,  6, 18,  7, 13,  8, 14, 19,  0,  1,  2,  3, 24,  4,  9],
        [22, 21, 23, 17, 16, 18, 24, 19, 12, 20, 15, 11, 13,  7, 10, 14,  6,  8,  2,  5,  9,  1,  3,  0,  4],
        [23, 22, 18, 19, 24, 17, 21, 13, 14, 12, 16, 11,  7,  8,  9,  6, 20,  3,  4, 15, 10,  2,  5,  0,  1],
        [24, 18, 23, 19, 14, 22, 17, 13, 12,  9, 21, 16,  8, 11,  7,  6,  0,  5,  1,  4,  3,  2, 20, 15, 10]
                                                                                                           ];

        const navigationRoute = Magic[creep.caveIndex()];

        // TODO visualise route
        for (let ridx = 0; ridx < navigationRoute.length; ++ridx)
        {
            const caveTargets = this._lookInCave(room, lookForType, filter, navigationRoute[ridx]);

            if (caveTargets.length > 0)
            {
                return caveTargets;
            }
        }

        return [];
    };

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
    Default target search for single creep.
    @param {Room} room.
    @param {Creep} creep.
    @return Possible targets.
    **/
    this._findTargetsForCreep = function(room, creep)
    {
        let statics  = undefined;
        let dynamics = undefined;

        if (this.staticTargets)
        {
            statics = this._findStaticTargets(room);
        }

        if (this.dynamicTargets)
        {
            dynamics = this.dynamicTargets(room, creep);
        }

        if (statics && (dynamics === undefined))
        {
            return statics;
        }

        if (dynamics && (statics === undefined))
        {
            return dynamics;
        }

        if (statics && dynamics)
        {
            return statics.concat(dynamics);
        }

        this.debugLine('Controller missing targets!');

        return [];
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

        if (creep.memory.rstk || creep.memory.minr)
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
            const targets = this._findTargetsForCreep(room, creep);

            // TODO clean up scope jumps

            // of them one that can be reached
            let target = undefined;
            let targetMove = undefined;

            // legacy scope
            {
                let self = this;

                // starting with closest, Manhattan distance is "good enough"
                targets.sort(
                    function(t1, t2)
                    {
                        const d1 = Math.abs(creep.pos.x - t1.pos.x) + Math.abs(creep.pos.y - t1.pos.y);
                        const d2 = Math.abs(creep.pos.x - t2.pos.x) + Math.abs(creep.pos.y - t2.pos.y);

                        if (d1 == d2 && self.tiebreaker)
                        {
                            return self.tiebreaker(t1, t2);
                        }

                        return d1 - d2;
                    }
                );

                // check, see if reacheable in any way
                for (let j = 0; j < targets.length; ++j)
                {
                    const inspected = targets[j].pos;
                    let found = inspected.inRangeTo(creep.pos, this.actRange);

                    if (!found)
                    {
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
                            found = inspected.inRangeTo(last.x, last.y, this.actRange);

                            if (found)
                            {
                                targetMove = solution;
                            }
                        }
                    }

                    if (found)
                    {
                        target = targets[j];
                        break;
                    }
                }
            }

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

        this._staticTargetCache = undefined;
        this._dynamicTargetCache = undefined;

        if (this._usesDefaultFilter)
        {
            if (room._isDefaultFiltered())
            {
                this.debugLine(room, 'Fast exit, no creeps with energy');
                return roomCreeps;
            }
        }

        // viable for fast check
        if (this.staticTargets && !this.dynamicTargets)
        {
            const st = this._findStaticTargets(room);

            if (st.length == 0)
            {
                this.debugLine(room, 'Fast exit, no targets');
                return roomCreeps;
            }
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
