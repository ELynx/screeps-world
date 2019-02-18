var globals = require('globals');

function Controller(id)
{
    this.id = id;

    this.actDistance = 1;

    this.debugPing = function(room)
    {
        globals.roomDebug(room, '<Controller ' + this.id + '>');
    };

    this.act = function(destination, creep)
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
            globals.roomDebug(room, 'No targets found');
            return 0;
        }

        const creeps = this.creeps(room);

        var assigned = 0;

        for (var i = 0; i < creeps.length; ++i)
        {
            const target = creeps[i].pos.findClosestByPath(targets);

            if (target)
            {
                globals.assignCreep(this, target, creeps[i]);
                ++assigned;
            }
        }

        globals.roomDebug(room, 'Creeps checked ' + creeps.length);
        globals.roomDebug(room, 'Creeps assigned ' + assigned);

        return assigned;
    };

    /**
    Default implementation.
    Print some debug and call creepsToTargets.
    **/
    this.control = function(room)
    {
        this.debugPing(room);

        return this.creepsToTargets(room);
    }
};

module.exports = Controller;
