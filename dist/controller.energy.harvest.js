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
    return room.find(FIND_MY_CREEPS,
        {
            filter: function(creep)
            {
                // STRATEGY restock only empty, reduce runs to sources
                return globals.creepNotAssigned(creep) && _.sum(creep.carry) == 0;
            }
        }
    );
};

module.exports = energyHarvestController;
