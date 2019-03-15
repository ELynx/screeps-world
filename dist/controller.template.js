'use strict';

var globals = require('globals');
var makeDebuggable = require('routine.debuggable');

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
    Flag to check reach-ability of target in expensive hardcode way.
    **/
    this.smartTargeting = false;

    /**
    Cache of target IDs that already have creep assigned.
    **/
    this._excludedTargets = undefined;

    /**
    Shortcut to current room level.
    **/
    this.roomLevel = undefined;

    /**
    Clear room target cache.
    **/
    this._prepareExcludedTargets = function(room)
    {
        this._excludedTargets = [];
    };

    /**
    Get room level to shortcut.
    **/
    this._prepareRoomLevel = function(room)
    {
        // TODO direct?
        this.roomLevel = room._level_;
    }

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
    @param {array<integer>} cave corners, or undefined.
    @return Targets that can be used.
    **/
    this._filterExcludedTargets = function(targets, caveTLBR)
    {
        if (targets.length == 0)
        {
            return targets;
        }

        for (var i = 0; i < this._excludedTargets.length && targets.length > 0; )
        {
            const excludedTarget = this._excludedTargets[i];

            if (caveTLBR)
            {
                const pos = Game.getObjectById(excludedTarget).pos;

                const x = pos.x;

                if (x < caveTLBR[1] || x > caveTLBR[3])
                {
                    ++i;
                    continue;
                }

                const y = pos.y;

                if (y < caveTLBR[0] || y > caveTLBR[2])
                {
                    ++i;
                    continue;
                }
            }

            var idx = -1;

            // TODO any faster?
            for (var j = 0; j < targets.length; ++j)
            {
                if (targets[j].id == excludedTarget)
                {
                    idx = j;
                    break;
                }
            }

            if (idx >= 0)
            {
                // remove from result
                targets.splice(idx, 1);

                // remove from cache, target is found once
                this._excludedTargets.splice(i, 1);
            }
            else
            {
                ++i;
            }
        } // end of loop for excluded target

        return targets;
    };

    /**
    Observe creep that is already controlled.
    @param {Creep} creep.
    **/
    this.observeMyCreep = undefined;

    /**
    Check for presense of restockers among creeps.
    @param {array<Creep} creeps.
    **/
    this.checkRestockers = function(creeps)
    {
        for (var i = 0; i < creeps.length; ++i)
        {
            if (creeps[i].memory.rstk == true)
            {
                return true;
            }
        }

        return false;
    };

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
    @param {int} caveX.
    @param {int} caveY.
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
            const t = room.memory.caveMap[1][caveY];
            const l = room.memory.caveMap[0][caveX];
            const b = room.memory.caveMap[1][caveY + 1] - 1;
            const r = room.memory.caveMap[0][caveX + 1] - 1;

            const looked = room.lookForAtArea(lookForType, t, l, b, r);

            var targets = [];

            for (var x in looked)
            {
                const ys = looked[x];

                for (var y in ys)
                {
                    const objs = ys[y];

                    if (objs)
                    {
                        for (var i = 0; i < objs.length; ++i)
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
                targets = this._filterExcludedTargets(targets, [t, l, b, r]);
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
        if (!creep.cidx)
        {
            const pos = creep.pos;

            var cidx = 0;

            for (var x = 0; x < room.memory.caveMap[0].length - 1; ++x)
            {
                if (pos.x >= room.memory.caveMap[0][x] &&
                    pos.x <  room.memory.caveMap[0][x + 1])
                {
                    cidx = x;
                    break;
                }
            }

            for (var y = 0; y < room.memory.caveMap[1].length - 1; ++y)
            {
                if (pos.y >= room.memory.caveMap[1][y] &&
                    pos.y <  room.memory.caveMap[1][y + 1])
                {
                    cidx = cidx + (room.memory.caveMap[0].length - 1) * y;
                    break;
                }
            }

            creep.cidx = cidx;
        }

        // TODO cave navigation

        // TODO fill in routes
        const Magic =
        [
        [ 0,  1,  5,  6,  2, 10,  7, 11, 12,  3, 15,  8, 16, 13, 17, 18,  4, 20,  9, 21, 14, 22, 19, 23, 24],
        [ 0,  1,  5,  6,  2, 10,  7, 11, 12,  3, 15,  8, 16, 13, 17, 18,  4, 20,  9, 21, 14, 22, 19, 23, 24],
        [ 0,  1,  5,  6,  2, 10,  7, 11, 12,  3, 15,  8, 16, 13, 17, 18,  4, 20,  9, 21, 14, 22, 19, 23, 24],
        [ 0,  1,  5,  6,  2, 10,  7, 11, 12,  3, 15,  8, 16, 13, 17, 18,  4, 20,  9, 21, 14, 22, 19, 23, 24],
        [ 0,  1,  5,  6,  2, 10,  7, 11, 12,  3, 15,  8, 16, 13, 17, 18,  4, 20,  9, 21, 14, 22, 19, 23, 24],
        [ 0,  1,  5,  6,  2, 10,  7, 11, 12,  3, 15,  8, 16, 13, 17, 18,  4, 20,  9, 21, 14, 22, 19, 23, 24],
        [ 0,  1,  5,  6,  2, 10,  7, 11, 12,  3, 15,  8, 16, 13, 17, 18,  4, 20,  9, 21, 14, 22, 19, 23, 24],
        [ 0,  1,  5,  6,  2, 10,  7, 11, 12,  3, 15,  8, 16, 13, 17, 18,  4, 20,  9, 21, 14, 22, 19, 23, 24],
        [ 0,  1,  5,  6,  2, 10,  7, 11, 12,  3, 15,  8, 16, 13, 17, 18,  4, 20,  9, 21, 14, 22, 19, 23, 24],
        [ 0,  1,  5,  6,  2, 10,  7, 11, 12,  3, 15,  8, 16, 13, 17, 18,  4, 20,  9, 21, 14, 22, 19, 23, 24],
        [ 0,  1,  5,  6,  2, 10,  7, 11, 12,  3, 15,  8, 16, 13, 17, 18,  4, 20,  9, 21, 14, 22, 19, 23, 24],
        [ 0,  1,  5,  6,  2, 10,  7, 11, 12,  3, 15,  8, 16, 13, 17, 18,  4, 20,  9, 21, 14, 22, 19, 23, 24],
        [ 0,  1,  5,  6,  2, 10,  7, 11, 12,  3, 15,  8, 16, 13, 17, 18,  4, 20,  9, 21, 14, 22, 19, 23, 24],
        [ 0,  1,  5,  6,  2, 10,  7, 11, 12,  3, 15,  8, 16, 13, 17, 18,  4, 20,  9, 21, 14, 22, 19, 23, 24],
        [ 0,  1,  5,  6,  2, 10,  7, 11, 12,  3, 15,  8, 16, 13, 17, 18,  4, 20,  9, 21, 14, 22, 19, 23, 24],
        [ 0,  1,  5,  6,  2, 10,  7, 11, 12,  3, 15,  8, 16, 13, 17, 18,  4, 20,  9, 21, 14, 22, 19, 23, 24],
        [ 0,  1,  5,  6,  2, 10,  7, 11, 12,  3, 15,  8, 16, 13, 17, 18,  4, 20,  9, 21, 14, 22, 19, 23, 24],
        [ 0,  1,  5,  6,  2, 10,  7, 11, 12,  3, 15,  8, 16, 13, 17, 18,  4, 20,  9, 21, 14, 22, 19, 23, 24],
        [ 0,  1,  5,  6,  2, 10,  7, 11, 12,  3, 15,  8, 16, 13, 17, 18,  4, 20,  9, 21, 14, 22, 19, 23, 24],
        [ 0,  1,  5,  6,  2, 10,  7, 11, 12,  3, 15,  8, 16, 13, 17, 18,  4, 20,  9, 21, 14, 22, 19, 23, 24],
        [ 0,  1,  5,  6,  2, 10,  7, 11, 12,  3, 15,  8, 16, 13, 17, 18,  4, 20,  9, 21, 14, 22, 19, 23, 24],
        [ 0,  1,  5,  6,  2, 10,  7, 11, 12,  3, 15,  8, 16, 13, 17, 18,  4, 20,  9, 21, 14, 22, 19, 23, 24],
        [ 0,  1,  5,  6,  2, 10,  7, 11, 12,  3, 15,  8, 16, 13, 17, 18,  4, 20,  9, 21, 14, 22, 19, 23, 24],
        [ 0,  1,  5,  6,  2, 10,  7, 11, 12,  3, 15,  8, 16, 13, 17, 18,  4, 20,  9, 21, 14, 22, 19, 23, 24],
        [ 0,  1,  5,  6,  2, 10,  7, 11, 12,  3, 15,  8, 16, 13, 17, 18,  4, 20,  9, 21, 14, 22, 19, 23, 24]
                                                                                                           ];

        const NavigationRoute = Magic[creep.cidx];

        for (var ridx = 0; ridx < NavigationRoute.length; ++ridx)
        {
            const caveTargets = this._lookInCave(room, lookForType, filter, NavigationRoute[ridx]);

            if (caveTargets.length > 0)
            {
                return caveTargets;
            }
        }

        return [];
    };

    /**
    Default target search for single creep.
    @param {Room} room.
    @param {Creep} creep.
    @return Possible targets.
    **/
    this._findTargetsForCreep = function(room, creep)
    {
        // TODO fast array operations
        var targets = [];

        if (this._staticTargetCache)
        {
            targets = this._staticTargetCache;
        }
        else if (this.staticTargets)
        {
            targets = this.staticTargets(room);

            // filter static targets here
            if (this._excludedTargets)
            {
                targets = this._filterExcludedTargets(targets, undefined);
            }

            this._staticTargetCache = targets;
        }

        if (this.dynamicTargets)
        {
            // filter dynamic targets internally to dynamic implementation
            const dt = this.dynamicTargets(room, creep);
            targets = targets.concat(dt);
        }

        return targets;
    };

    /**
    Creep that has some energy.
    @param {Creep} creep to look at.
    @return If creep has some energy.
    **/
    this._creepHasEnergy = function(creep)
    {
        return creep.carry.energy > 0;
    };

    /**
    Default implementation.
    @param {Creep} creep to look at.
    @return If creep can be used.
    **/
    this.filterCreep = function(creep)
    {
        return this._creepHasEnergy(creep);
    };

    /**
    Default implementation.
    @param {Room} room
    @param {array<Creep>} creeps.
    @return Not assigned creeps.
    **/
    this.assignCreeps = function(room, creeps)
    {
        this._staticTargetCache = undefined;
        this._dynamicTargetCache = undefined;

        const checked = creeps.length;
        var assigned = 0;

        for (var i = 0; i < creeps.length;)
        {
            const creep = creeps[i];

            // all suitable targets
            const targets = this._findTargetsForCreep(room, creep);

            // of them one that can be reached
            var target = undefined;

            // STRATEGY few controllers actually need smart movement
            if (this.smartTargeting)
            {
                target = creep.pos.findClosestByPath(targets);
            }
            else
            {
                // starting with closest, Manhattan distance is "good enough"
                targets.sort(
                    function(t1, t2)
                    {
                        const d1 = Math.abs(creep.pos.x - t1.pos.x) + Math.abs(creep.pos.y - t1.pos.y);
                        const d2 = Math.abs(creep.pos.x - t2.pos.x) + Math.abs(creep.pos.y - t2.pos.y);

                        return d1 - d2;
                    }
                );

                // check, see if reacheable in any way
                for (var j = 0; j < targets.length; ++j)
                {
                    // TODO so much tweaking here
                    const solution = PathFinder.search(
                                creep.pos,
                                { pos: targets[j].pos, range: 1 },
                                {}
                            );

                    if (!solution.incomplete)
                    {
                        target = targets[j];
                        break;
                    }
                }
            }

            if (target)
            {
                globals.assignCreep(this, target, creep);
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

        var creepMatch = [];
        var creepSkip  = [];

        for (var i = 0; i < roomCreeps.length; ++i)
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
            this.debugLine(room, 'No creeps found');
            return roomCreeps;
        }

        creepMatch = this.assignCreeps(room, creepMatch);

        if (creepMatch.length > 0)
        {
            return creepSkip.concat(creepMatch);
        }
        else
        {
            return creepSkip;
        }
    };

    /**
    Register into globals.
    **/
    this.register = function()
    {
        globals.registerRoomController(this);
    };
};

module.exports = Controller;
