'use strict';

var bodywork = require('routine.bodywork');
var Controller = require('controller.template');

var ttlController = new Controller('ttl');

// STRATEGY time when stronger creep is called for renew
const Ttl = 200;

ttlController.actRange = 1;

ttlController.act = function(spawn, creep)
{
    // by default creep is here only for renewal
    let renew   = true;
    let recycle = false;

    // if spawning started
    if (spawn.spawning)
    {
        // if creep will not live long enough
        if (creep.ticksToLive <= spawn.spawning.remainingTime)
        {
            // just give some resources back
            renew   = false;
            recycle = true;
        }
        else
        {
            // wait
            renew   = false;
            recycle = false;
        }
    }

    if (recycle)
    {
        return spawn.recycleCreep(creep) == OK;
    }

    if (renew)
    {
        return spawn.renewCreep(creep) == OK;
    }

    return true;
};

ttlController.staticTargets = function(room)
{
    return room.find(FIND_MY_SPAWNS,
        {
            filter: function(spawn)
            {
                return !spawn.spawning && spawn.isActiveSimple();
            }
        }
    );
};

ttlController.filterCreep = function(creep)
{
    if (creep.ticksToLive > Ttl)
    {
        return false;
    }

    // just fast check to skip repeated state check
    if (creep.memory.xttl)
    {
        return false;
    }

    // STRATEGY don't drag resources around
    if (creep.sumCarry() > 0)
    {
        return false;
    }

    // do background check
    const room = Game.rooms[creep.memory.crum];
    if (room)
    {
        // renew creeps that are higher level than room can produce
        const [level, exampleBody] = bodywork[creep.memory.btyp](room.memory.elvl);
        if (creep.memory.levl > level)
        {
            return true;
        }
    }

    // flag to avoid repeated checks
    creep.memory.xttl = true;

    return false;
};

ttlController.register();

module.exports = ttlController;
