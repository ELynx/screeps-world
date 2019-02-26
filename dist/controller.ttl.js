var Controller = require('controller.template');

var ttlController = new Controller('ttl');

const TypeTtL = [50, 50];

ttlController.actDistance = 1;

ttlController.oneToOne = false;

ttlController.act = function(spawn, creep)
{
    // TODO how to know if needed
    //if (needed count is greater than present)
    //{
    //    recycle
    //}

    // if from previous level
    if (creep.memory.levl < this.roomLevel)
    {
        return spawn.recycleCreep(creep) == OK;
    }

    // renewal part

    // if controller started to spawn at the same time wait for it
    if (spawn.spawning)
    {
        return true;
    }

    return spawn.renewCreep(creep) == OK;
};

ttlController.findTargets = function(room)
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
    return creep.ticksToLive <= TypeTtL[creep.memory.btyp]
};

module.exports = ttlController;
