'use strict';

var Controller = require('controller.template');

var ttlController = new Controller('ttl');

const TypeTtL = [50, 50];

ttlController.actRange = 1;

ttlController.act = function(spawn, creep)
{
    // TODO how to know if needed
    //if (needed count is greater than present)
    //{
    //    recycle
    //}

    // if from previous level
    if (creep.memory.levl < creep.room._level_)
    {
        return spawn.recycleCreep(creep) == OK;
    }

    // TODO mix with healing
    // if has disabled body parts
    if (creep.hitsMax - creep.hits > 99)
    {
        return spawn.recycleCreep(creep) == OK;
    }

    // renewal part

    // if controller started to spawn at the same time wait for it
    if (spawn.spawning)
    {
        if (creep.ticksToLive < 2)
        {
            return spawn.recycleCreep(creep) == OK;
        }

        return true;
    }

    return spawn.renewCreep(creep) == OK;
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
