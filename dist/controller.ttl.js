var globals = require('globals');
var Controller = require('controller.template');

var ttlController = new Controller('ttl');

const TypeTtL = [50, 50];

ttlController.roomLevel = undefined;

// group effort from distance 1
ttlController.actDistance = 1;

/**
Prepare for new room.
**/
ttlController.roomPrepare = function(room)
{
    this.targetCache = [];
    this.roomLevel = globals.loopCache[room.id].level;
};

ttlController.act = function(spawn, creep)
{
    return spawn.recycleCreep(creep) == OK;
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
