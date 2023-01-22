'use strict';

var bodywork = require('routine.bodywork');
var Controller = require('controller.template');

var ttlController = new Controller('ttl');

// STRATEGY time when stronger creep is called for renew
const TTL = 200;

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

    if (creep.memory.recycle == true)
    {
        renew   = false;
        recycle = true;
    }

    if (renew)
    {
        const rc = spawn.renewCreep(creep);
        if (rc == OK) return rc;

        // forgetaboutit
        recycle = true;
    }

    if (recycle)
    {
        return spawn.recycleCreep(creep);
    }

    return OK;
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
                    // STRATEGY direct creep to nearest spawn, figure out on arrival
                    return structure.isActiveSimple();
                }

                return false;
            }
        }
    );
};

ttlController.filterCreep = function(creep)
{
    // cannot walk, do not waste CPU on pathfinding
    if (creep.getActiveBodyparts(MOVE) == 0) return false;

    // recycle was forced
    if (creep.memory.recycle == true) return true;

    // too young
    if (creep.ticksToLive > TTL) return false;

    // fast check if was rejected once
    if (creep.memory._ttl) return false;

    // STRATEGY don't drag resources around
    if (!this._isEmpty(creep)) return false;

    // check creeps with default body type
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
    creep.memory._ttl = true;

    return false;
};

ttlController.register();

module.exports = ttlController;
