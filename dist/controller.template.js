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
    this.targetCache = undefined;

    /**
    Shortcut to current room level.
    **/
    this.roomLevel = undefined;

    /**
    Clear room target cache.
    Make it not undefined, so targets are added during observation.
    **/
    this._prepareTargetCache = function(room)
    {
        this.targetCache = [];
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
    Observe a creep
    Base class implementation.
    Duration - room.
    @param {Creep} creep.
    **/
    this._observeCreep = function(creep)
    {
        if (this.targetCache)
        {
            this.targetCache.push(creep.memory.dest);
        }
    };

    /**
    Observe a creep.
    @param {Creep} creep.
    **/
    this.observeCreep = function(creep)
    {
        this._observeCreep(creep);
    }

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
    Targets within room, partial search.
    Dynamic means different targets may be found each call.
    @param {Room} room.
    @return Found dynamic targets.
    **/
    this.dynamicTargets = undefined;

    /**
    Default target search for single creep.
    @param {Room} room.
    @param {Creep} creep.
    @return Possible targets.
    **/
    this._findTargetsForCreep = function(room, creep)
    {
        var targets = [];

        if (this.staticTargets)
        {
            targets = this.staticTargets(room);
        }

        if (this.dynamicTargets)
        {
            var dt = this.dynamicTargets(room, creep);
            targets = targets.concat(dt);
        }

        // TODO filter here?

        return targets;
    }

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
        /*var assigned = 0;

        for (var i = 0; i < creeps.length;)
        {
            // TODO PathFinder + range
            const target = creeps[i].pos.findClosestByPath(targets);

            if (target)
            {
                globals.assignCreep(this, target, creeps[i]);
                creeps.splice(i, 1);

                ++assigned;

                continue;
            }

            ++i;
        }

        this.debugLine(room, 'Creeps checked ' + creeps.length);
        this.debugLine(room, 'Creeps assigned ' + assigned);*/

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

        var creepMatch = this.assignCreeps(room, creepMatch);

        if (creepMatch.length > 0)
        {
            return creepSkip.concat(creepMatch);
        }
        else
        {
            return creepSkip;
        }
    };

    // register into easy access array
    globals.registerRoomController(this);
};

module.exports = Controller;
