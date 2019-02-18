var globals = require('globals');
var Controller = require('controller.template');

// TODO energy on ground
var energyHarvestController = new Controller('energy.harvest');

energyHarvestController.act = function(source, creep)
{
    var result = false;

    // TODO no error code for this?
    if (_.sum(creep.carry) < creep.carryCapacity)
    {
        result = creep.harvest(source) == OK;
    }

    return result;
};

energyHarvestController.targets = function(room)
{
    return room.find(FIND_SOURCES_ACTIVE);
};

energyHarvestController.creeps = function(room)
{
    const hasRestockers = room.find(FIND_MY_CREEPS,
        {
            filter: function(creep)
            {
                return creep.memory.hvst && !creep.memory.rstk;
            }
        }
    ).length > 0;

    return room.find(FIND_MY_CREEPS,
        {
            filter: function(creep)
            {
                // STRATEGY don't run restockable creeps if there are restockers present
                if (hasRestockers && creep.memory.rstk)
                {
                    return false;
                }

                // STRATEGY harvest with empty only, reduce runs to sources
                return creep.memory.hvst && globals.creepNotAssigned(creep) && _.sum(creep.carry) == 0;
            }
        }
    );
};

module.exports = energyHarvestController;
