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
    var creeps = room.find(FIND_MY_CREEPS,
        {
            filter: function(creep)
            {
                // STRATEGY harvest with empty only, reduce runs to sources
                return creep.memory.hvst && globals.creepNotAssigned(creep) && _.sum(creep.carry) == 0;
            }
        }
    );

    if (creeps.length == 0)
    {
        return [];
    }

    // STRATEGY creeps with flag restock go to source on their own only when there are no other options

    var restocker = false;
    for (var i = 0; i < creeps.length && !restocker; ++i)
    {
        restocker = !creeps[i].memory.rstk;
    }

    if (!restocker)
    {
        return creeps;
    }

    var result = [];
    for (var i = 0; i < creeps.length; ++i)
    {
        if (!creeps[i].memory.rstk)
        {
            result.concat(creeps[i]);
        }
    }

    return result;
};

module.exports = energyHarvestController;
