var globals = require('globals');

function Controller(id)
{
    this.id = id;

    this.actDistance = 1;

    this.targetCache = undefined;

    this.verbose = false;

    /**
    Write a common debug line, and move caret to next line.
    @param {Room} room to overlay with text.
    @param {string} what.
    **/
    this.debugLine = function(room, what)
    {
        if (this.verbose)
        {
            globals.roomDebug(room, what);
        }
    };

    /**
    Write controller greeting.
    @param {Room} room to overlay with text.
    **/
    this.debugHeader = function(room)
    {
        if (this.verbose)
        {
            this.debugLine(room, '<Controller ' + this.id + '>');
        }
    };

    /**
    Prepare for new room.
    **/
    this.roomPrepare = function()
    {
        this.targetCache = [];
    };

    /**
    Remember creeps and targets that are already worked by controller.
    Duration - room.
    **/
    this.rememberCreep = function(creep)
    {
        this.targetCache.push(
            {
                targetId: creep.memory.dest,
                creepName: creep.name
            }
        );
    };

    /**
    Do something with target and creep then they met.
    @param {???} target.
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
    Default implementation.
    Find unassigned creep that has some energy.
    @param {array<Creep>} creeps to look at.
    @return Creeps that can be used.
    **/
    this.findCreeps = function(creeps)
    {
        var result = [];

        for (var i = 0; i < creeps.length; ++i)
        {
            if (creeps[i].carry.energy > 0)
            {
                result.push(creeps[i]);
            }
        }

        return result;
    };

    /**
    Default implementation.
    Assign each creep to closest target.
    @param {Room} room
    @param {array<???>} targets.
    @param {array<Creep>} creeps.
    **/
    this.creepsToTargets = function(room, targets, creeps)
    {
        var assigned = 0;

        for (var i = 0; i < creeps.length; ++i)
        {
            // TODO PathFinder + range
            const target = creeps[i].pos.findClosestByPath(targets);

            if (target)
            {
                globals.assignCreep(this, target, creeps[i]);
                ++assigned;
            }
        }

        this.debugLine(room, 'Creeps checked ' + creeps.length);
        this.debugLine(room, 'Creeps assigned ' + assigned);
    };

    /**
    Default implementation.
    Print some debug and call creepsToTargets.
    @param {Room} room to control.
    @param {array<Creeps>} roomCreeps to control.
    **/
    this.control = function(room, roomCreeps)
    {
        this.debugHeader(room);

        const targets = this.findTargets(room);

        if (targets.length == 0)
        {
            this.debugLine(room, 'No targets found');
            return;
        }

        const creeps = this.findCreeps(roomCreeps);

        this.creepsToTargets(room, targets, creeps);
    };
};

module.exports = Controller;
