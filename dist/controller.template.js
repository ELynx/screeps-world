var globals = require('globals');
var makeDebuggable = reqire('routine.debuggable');

function Controller(id)
{
    this.id = id;

    makeDebuggable(this, 'Controller');

    this.actDistance = 1;

    this.oneToOne = true;
    this.targetCache = undefined;

    this.roomLevel = undefined;

    /**
    Prepare for new room.
    Base class implementation.
    @param {Room} room.
    **/
    this._roomPrepare = function(room)
    {
        if (this.oneToOne)
        {
            this.targetCache = [];
        }

        this.roomLevel = globals.loopCache[room.id].level;
    };

    /**
    Prepare for new room.
    @param {Room} room.
    **/
    this.roomPrepare = function(room)
    {
        this._roomPrepare(room);
    };

    /**
    Observe a creep
    Base class implementation.
    Duration - room.
    @param {Creep} creep.
    **/
    this._observeCreep = function(creep)
    {
        if (this.oneToOne)
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
    this.act = function(target, creep)
    {
        return false;
    };

    /**
    Look for targets within room.
    @param {Room} room.
    @return Found targets.
    **/
    this.findTargets = function(room)
    {
        return [];
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
    @param {array<Object>} targets.
    @param {array<Creep>} creeps.
    @return Not assigned creeps.
    **/
    this.crossAssign = function(room, targets, creeps)
    {
        var assigned = 0;

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

        var targets = this.findTargets(room);

        if (targets.length == 0)
        {
            this.debugLine(room, 'No targets found');
            return roomCreeps;
        }

        if (this.targetCache && this.targetCache.length > 0)
        {
            // leave only new targets
            for (var i = 0; i < targets.length; )
            {
                if (this.targetCache.indexOf(targets[i].id) >= 0)
                {
                    targets.splice(i, 1);
                }
                else
                {
                    ++i;
                }
            }
        }

        var creepMatch = this.crossAssign(room, targets, creepMatch);

        if (creepMatch.length > 0)
        {
            return creepSkip.concat(creepMatch);
        }
        else
        {
            return creepSkip;
        }
    };

    globals.registerRoomController(this);
};

module.exports = Controller;
