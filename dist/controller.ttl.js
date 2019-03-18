'use strict';

var Controller = require('controller.template');

var ttlController = new Controller('ttl');

const TypeTtL = [50, 50];

ttlController.actRange = 1;

ttlController.act = function(spawn, creep)
{
    var recycle = false;
    var renew = false;
    var rc = false;

    // TODO how to know if needed
    //if (needed count is greater than present)
    //{
    //    recycle
    //}

    // if from previous level
    if (creep.memory.levl < spawn.room.memory.elvl)
    {
        recycle = true;
    }
    // TODO mix with healing
    // if has disabled body parts
    else if (creep.hitsMax - creep.hits > 99)
    {
        recycle = true;
    }
    // renewal part
    // if controller started to spawn at the same time wait for it
    else if (spawn.spawning)
    {
        if (creep.ticksToLive < 2)
        {
            recycle = true;
        }
        else
        {
            rc = true;
        }
    }
    else
    {
        renew = true;
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
                return spawn.isActive();
            }
        }
    );
};

ttlController.filterCreep = function(creep)
{
    // TODO mix with healing
    // if has disabled body parts
    if (creep.hitsMax - creep.hits > 99)
    {
        return true;
    }

    return creep.ticksToLive <= TypeTtL[creep.memory.btyp]
};

ttlController.register();

module.exports = ttlController;
