var globals = require('globals');
var Controller = require('controller.template');

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
    return room.find(FIND_MY_CREEPS,
        {
            filter: function(creep)
            {
                // STRATEGY don't run restockable creeps to source if there are restockers
                if (room.memory.hasRestockers && creep.memory.rstk == false)
                {
                    return false;
                }

                // STRATEGY harvest with empty only, reduce runs to sources
                return creep.memory.hvst == true && globals.creepNotAssigned(creep) && (_.sum(creep.carry) == 0)
            }
        }
    );
};

module.exports = energyHarvestController;
