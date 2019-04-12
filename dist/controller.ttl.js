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
    if (creep.ticksToLive > Ttl)
    {
        return false;
    }

    // STRATEGY don't drag resources around
    return creep.sumCarry() > 0;
};

ttlController.register();

module.exports = ttlController;
