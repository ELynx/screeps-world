var globals = require('globals');

function Controller(id)
{
    this.id = id;

    this.actDistance = 1;

    this.actNoCreeps = false;

    this.targetCacheTime = -1;
    this.targetCache = [];

    this.verbose = false;

    this.debugLine = function(room, what)
    {
        if (this.verbose)
        {
            globals.roomDebug(room, what);
        }
    };

    this.debugHeader = function(room)
    {
        if (this.verbose)
        {
            this.debugLine(room, '<Controller ' + this.id + '>');
        }
    };

    this.rememberCreep(creep)
    {
        if (this.targetCacheTime != Game.time)
        {
            this.targetCache = [];
        }

        this.targetCacheTime = Game.time;
        this.targetCache.push(
            {
                targetId: creep.memory.dest,
                creepName: creep.name
            }
        );
    };

    this.act = function(target, creep)
    {
        return false;
    };

    this.findTargets = function(room)
    {
        return [];
    };

    /**
    Default implementation.
    Find unassigned creep that has some energy.
    **/
    this.findCreeps = function(creeps)
    {
        var result = [];

        for (var i = 0; i < creeps.length; ++i)
        {
            const creep = creeps[i];

            if (globals.creepNotAssigned(creep) && creep.carry.energy > 0)
            {
                result.push(creep);
            }
        }

        return result;
    };

    /**
    Default implementation.
    Assign each creep to closest target.
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
