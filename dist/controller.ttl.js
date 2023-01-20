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

    if (renew)
    {
        const rc = spawn.renewCreep(creep);
        if (rc == OK)
        {
            return true;
        }

        // forgetaboutit
        recycle = true;
    }

    if (recycle)
    {
        return spawn.recycleCreep(creep) == OK;
    }

    return true;
};

ttlController.targets = function(room)
{
    return room.find(
        FIND_STRUCTURES,
        {
            filter: function(structure)
            {
                if (structure.structureType == STRUCTURE_SPAWN)
                {
                    return !structure.spawning && structure.isActiveSimple();
                }

                return false;
            }
        }
    );
};

ttlController.filterCreep = function(creep)
{
    // if recycle was forced
    if (creep.memory.recycle) return true;

    if (creep.ticksToLive > Ttl) return false;

    // just fast check to skip repeated state check
    if (creep.memory.xttl) return false;

    // STRATEGY don't drag resources around
    if (creep.store.getUsedCapacity() > 0) return false;

    // only check creeps with known body type
    const btyp = creep.memory.btyp;
    if (btyp && bodywork[btyp])
    {
        // do background check
        const room = Game.rooms[creep.memory.crum];
        if (room)
        {
            // renew creeps that are higher level than room can produce
            const exampleBody = bodywork[btyp](room.memory.elvl);
            if (exampleBody.length < creep.body.length)
            {
                return true;
            }
        }
    }

    // flag to avoid repeated checks
    creep.memory.xttl = true;

    return false;
};

ttlController.register();

module.exports = ttlController;
