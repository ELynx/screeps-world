'use strict';

var bodywork = require('routine.bodywork');
var Controller = require('controller.template');

var ttlController = new Controller('ttl');

// STRATEGY time when creep is called for renew
const Ttl = 100;

ttlController.actRange = 1;

ttlController.enough = function(room)
{
    const st = this._findStaticTargets(room);
    return st.length;
};

ttlController.act = function(spawn, creep)
{
    let recycle = false;
    let increaseCcnt = false;

    // if not needed
    if (spawn.room.memory.ccnt &&
        spawn.room.memory.ccnt[creep.memory.btyp] < 0)
    {
        recycle = true;
        increaseCcnt = true;
    }

    if (!recycle)
    {
        // example parameters
        const [level, exampleBody] = bodywork[creep.memory.btyp](spawn.room.memory.elvl);

        if (creep.memory.levl < level)
        {
            recycle = true;
        }
        else if (creep.memory.levl == level)
        {
            if (exampleBody.length == creep.body.length)
            {
                for (let i = 0; i < exampleBody.length && !recycle; ++i)
                {
                    recycle = exampleBody[i] != creep.body[i].type;
                }
            }
            else
            {
                recycle = true;
            }
        }
    }

    let renew = !recycle;
    let rc = false;

    if (renew && spawn.spawning)
    {
        if (creep.ticksToLive <= spawn.spawning.remainingTime)
        {
            recycle = true;
        }
        else
        {
            renew = false;
            rc = true;
        }
    }

    // donate while here
    if (spawn.energy < spawn.energyCapacity && creep.carry.energy > 0)
    {
        creep.transfer(spawn, RESOURCE_ENERGY);
    }

    if (recycle)
    {
        rc = spawn.recycleCreep(creep) == OK;

        if (rc && increaseCcnt)
        {
            ++spawn.room.memory.ccnt[creep.memory.btyp];
        }
    }

    if (renew)
    {
        rc = spawn.renewCreep(creep) == OK;
    }

    return rc;
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
    // STRATEGY don't die often if carry resources
    if (creep.sumCarry() > 0)
    {
        return creep.ticksToLive <= Ttl;
    }

    // STRATEGY don't drag resources around
    return creep.ticksToLive <= 2 * Ttl;
};

ttlController.register();

module.exports = ttlController;
