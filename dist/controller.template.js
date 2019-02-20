var globals = require('globals');

function Controller(id)
{
    this.id = id;

    this.actDistance = 1;

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

    this.act = function(target, creep)
    {
        return false;
    };

    this.targets = function(room)
    {
        return [];
    };

    /**
    Default implementation.
    Find unassigned creep that has some energy.
    **/
    this.creeps = function(room)
    {
        return room.find(FIND_MY_CREEPS,
            {
                filter: function(creep)
                {
                    return globals.creepNotAssigned(creep) && creep.carry.energy > 0;
                }
            }
        );
    };

    /**
    Default implementation.
    Look for targets.
    If there are targets then look for creeps.
    Assign each creep to closest target.
    **/
    this.creepsToTargets = function(room)
    {
        const targets = this.targets(room);

        if (targets.length == 0)
        {
            this.debugLine(room, 'No targets found');
            return 0;
        }

        const creeps = this.creeps(room);

        var assigned = 0;

        for (var i = 0; i < creeps.length; ++i)
        {
            const result = PathFinder.search(creeps[i].pos, { pos: targets[0].pos, range: this.actDistance });

            if (!result.incomplete)
            {
                globals.assignCreep(this, target, creeps[i], result.path);
                ++assigned;
            }
        }

        this.debugLine(room, 'Creeps checked ' + creeps.length);
        this.debugLine(room, 'Creeps assigned ' + assigned);

        return assigned;
    };

    /**
    Default implementation.
    Print some debug and call creepsToTargets.
    **/
    this.control = function(room)
    {
        this.debugHeader(room);

        return this.creepsToTargets(room);
    }
};

module.exports = Controller;
