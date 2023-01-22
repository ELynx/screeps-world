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
    Flag to execute target search with interleave.
    **/
    this.oddOrEven = undefined;

    /**
    Cache of target IDs that already have creep assigned.
    **/
    this._excludedTargets = undefined;

    /**
    Detect if assigned targets are excluded
    **/
    this._creepPerTarget = false;

    /**
    Clear room target cache.
    **/
    this._prepareExcludedTargets = function(room)
    {
        this._creepPerTarget = true;
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
                return !_.some(exclude, _.matches(target.id));
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
    Do something with target and creep then they met.
    @param {Object} target.
    @param {Creep} creep.
    @return Creep intent return code.
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
        const roomCreeps = target.room.getRoomControlledCreeps();
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

    this._hasWCM = function(creep)
    {
        return creep.getActiveBodyparts(WORK)  > 0 &&
               creep.getActiveBodyparts(CARRY) > 0 &&
               creep.getActiveBodyparts(MOVE)  > 0;
    };

    this._hasEnergy = function(creep)
    {
        return creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
    };

    this._isEmpty = function(creep)
    {
        return creep.store.getUsedCapacity() == 0;
    };

    this._isWorkAble = function(creep)
    {
        return this._hasEnergy(creep) && this._hasWCM(creep);
    };

    this._isHarvestAble = function(creep)
    {
        // STRATEGY harvest with empty only, reduce runs to sources
        return this._isEmpty(creep) && this._hasWCM(creep);
    };

    /**
    Creep that has energy and can perform general work
    @param {Creep} creep to look at.
    @return If creep matches filter.
    **/
    this._defaultFilter = function(creep)
    {
        this._usesDefaultFilter = true;

        return this._isWorkAble(creep);
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

    this._manhattanDistanceCost = function(target, creep)
    {
        return target.pos.manhattanDistance(creep.pos);
    };

    /**
    COST of creep working on target.
    Lower is better, higher is worse.
    **/
    this.creepToTargetCost = function(target, creep)
    {
        return this._manhattanDistanceCost(target, creep);
    };

    this._targetToCreepSort = function(creep, t1, t2)
    {
        const cost1 = this.creepToTargetCost(t1, creep);
        const cost2 = this.creepToTargetCost(t2, creep);

        return cost1 - cost2;
    };

    /**
    @param {Room} room
    @param {array<Creep>} roomCreeps.
    @return Not assigned creeps.
    **/
    this.assignCreeps = function(room, roomCreeps)
    {
        let remainingTargets = this._findTargets(room);

        this.debugLine(room, 'Targets checked ' + remainingTargets.length);
        this.debugLine(room, 'Creeps checked  ' + roomCreeps.length);

        let unassignedCreeps = [];

        for (let i = 0; i < roomCreeps.length; ++i)
        {
            if (remainingTargets.length == 0)
            {
                // don't forget creeps that are not tested at all
                const creepsLeft = roomCreeps.slice(i);

                if (unassignedCreeps.length == 0)
                    unassignedCreeps = creepsLeft;
                else
                    unassignedCreeps = unassignedCreeps.concat(creepsLeft);

                break; // from creeps cycle
            }

            const creep = roomCreeps[i];

            // to avoid re-sorting array
            let targets = remainingTargets.slice(0);

            // sort targets in order of increased effort
            targets.sort(
                _.bind(
                    function(t1, t2)
                    {
                        return this._targetToCreepSort(creep, t1, t2);
                    },
                    this
                )
            );

            let target = undefined;
            let path   = undefined;

            for (let j = 0; j < targets.length; ++j)
            {
                const currentTarget = targets[j];

                // more expensive check that sort
                // see if assingment breaks some specific creep-target
                if (this.validateTarget)
                    if (this.validateTarget(currentTarget, creep) == false)
                        continue; // to next target

                if (creep.pos.inRangeTo(currentTarget.pos, this.actRange))
                {
                    target = currentTarget;
                }
                else
                {
                    const solution = room.findPath(
                        creep.pos,
                        currentTarget.pos,
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
                        const found = currentTarget.pos.inRangeTo(last.x, last.y, this.actRange);
                        if (found)
                        {
                            target = currentTarget;
                            path   = solution;
                        }
                    }
                }

                if (target) break; // out of target loop
            } // end of target loop

            if (target)
            {
                let extra = undefined;

                if (_.isFunction(this.extra))
                {
                    extra = this.extra(target);
                }
                else if (_.isObject(this.extra))
                {
                    extra = this.extra;
                }

                globals.assignCreep(this, target, path, creep, extra);

                // simulate single assignment logic on small scale
                if (this._creepPerTarget)
                {
                    remainingTargets = _.filter(
                        remainingTargets,
                        function(someTarget)
                        {
                            return someTarget.id != target.id;
                        }
                    );
                }
            }
            else
            {
                unassignedCreeps.push(creep);
            }
        } // end of creeps loop

        this.debugLine(room, 'Creeps assigned ' + (roomCreeps.length - unassignedCreeps.length));

        return unassignedCreeps;
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

        if (this.oddOrEven)
        {
            if ((room.memory.intl + Game.time) % 2 != this.oddOrEven)
            {
                this.debugLine(room, 'Fast exit, oddOrEven check');
                return roomCreeps;
            }
        }

        if (this._usesDefaultFilter)
        {
            if (room._isDefaultFiltered())
            {
                this.debugLine(room, 'Fast exit, no creeps with default parameters');
                return roomCreeps;
            }
        }

        // wipe the cache from previous room now
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
                this.debugLine(room, 'No creeps with default parameters found');
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
                this.debugLine(room, 'All creeps with default parameters used');
            }

            return creepSkip;
        }
    };

    this.wrapIntent = function(creep, intentName, arg0 = undefined, arg1 = undefined, arg2 = undefined)
    {
        const intent = creep[intentName];
        if (intent === undefined)
        {
            console.log('Invalid intent [' + intentName + '] called for creep [' + creep.name + ']');
            return globals.ERR_INVALID_INTENT_NAME;
        }

        const boundIntent = _.bind(intent, creep);

        let rc = globals.ERR_INVALID_INTENT_ARG;

        if      (arg2 !== undefined) rc = boundIntent(arg0, arg1, arg2);
        else if (arg1 !== undefined) rc = boundIntent(arg0, arg1);
        else if (arg0 !== undefined) rc = boundIntent(arg0);
        else                         rc = boundIntent();

        return rc;
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
