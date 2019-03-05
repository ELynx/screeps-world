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
        this.roomLevel = globals.loopCache[room.name].level;
    }

    /**
    Prepare for new room.
    @param {Room} room.
    **/
    this.roomPrepare = function(room)
    {
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
    When target is filtered out excluded target list is reduced.
    @param {array<Object>} targets to filter.
    @param {array<integer>} cave cornesr, or undefined.
    @return Targets that can be used.
    **/
    this._filterExcludedTargets = function(targets, caveTLBR)
    {
        for (var i = 0; i < targets.length && this._excludedTargets.length > 0; )
        {
            const target = targets[i];

            if (caveTLBR)
            {
                const x = target.pos.x;

                if (x < caveTLBR[1] || x > caveTLBR[3])
                {
                    ++i;
                    continue;
                }

                const y = target.pos.y;

                if (y < caveTLBR[0] || y > caveTLBR[2])
                {
                    ++i;
                    continue;
                }
            }

            const idx = this._excludedTargets.indexOf(target.id);

            if (idx >= 0)
            {
                // remove from result
                targets.splice(i, 1);

                // remove from cache, target is found once
                this._excludedTargets.splice(idx, 1);
            }
            else
            {
                ++i;
            }
        }

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
    Search room using odd-even cave logic.
    @param {Room} room.
    @param {LOOK_*} lookForType.
    @param {function} filter.
    @param {int} caveIndex.
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

        if (caveIndex < room.memory.caveMap.length)
        {
            const caveTLBR = room.memory.caveMap[caveIndex];

            const looked = room.lookForAtArea(
                lookForType,
                caveTLBR[0], caveTLBR[1], caveTLBR[2], caveTLBR[3]
            );

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
            // TODO by position also
            if (this._excludedTargets)
            {
                targets = this._filterExcludedTargets(targets, caveTLBR);
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
    **/
    this._lookAroundCreep = function(room, lookForType, filter, creep)
    {
        // TODO back and forth
        return this._lookInCave(room, lookForType, filter, creep.memory.cidx);
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
    Base class implementation.
    Find creep that has some energy.
    @param {Creep} creep to look at.
    @return If creep can be used.
    **/
    this._filterCreep = function(creep)
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
        return this._filterCreep(creep);
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

            const targets = this._findTargetsForCreep(room, creep);
            const target = creep.pos.findClosestByPath(targets);

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
