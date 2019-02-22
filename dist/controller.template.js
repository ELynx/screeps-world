var globals = require('globals');

function Controller(id)
{
    this.id = id;

    this.actDistance = 1;

    this.oneToTarget = true;

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
        this.targetCache.push(creep.memory.dest);
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
    @param {Creep} creep to look at.
    @return True if creep can be used.
    **/
    this.filterCreep = function(creep)
    {
        return creep.carry.energy > 0
    };

    /**
    Default implementation.
    Assign each creep to closest target.
    @param {Room} room
    @param {array<???>} targets.
    @param {array<Creep>} creeps.
    @return not assigned creeps.
    **/
    this.creepsToTargets = function(room, targets, creeps)
    {
        var assigned = 0;

        for (var i = 0; i < creeps.length;)
        {
            // TODO PathFinder + range
            if (this.filterCreep(creeps[i]))
            {
                const target = creeps[i].pos.findClosestByPath(targets);

                if (target)
                {
                    globals.assignCreep(this, target, creeps[i]);
                    creeps.splice(i, 1);

                    ++assigned;

                    continue;
                }
            }

            ++i;
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

        var targets = this.findTargets(room);

        if (targets.length == 0)
        {
            this.debugLine(room, 'No targets found');
            return;
        }

        if (this.oneToTarget && this.targetCache.length > 0)
        {
            // leave only new targets
            for (var i = 0; i < targets.length; )
            {
                if (this.targetCache.indexOf(targets[i].id) >= 0)
                {
                    targets.splice(i);
                }
                else
                {
                    ++i;
                }
            }
        }

        this.creepsToTargets(room, targets, roomCreeps);
    };
};

module.exports = Controller;
