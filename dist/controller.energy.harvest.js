'use strict';

var Controller = require('controller.template');

var energyHarvestController = new Controller('energy.harvest');

energyHarvestController.actRange = 1;

energyHarvestController.ignoreCreepsForTargeting = false;

energyHarvestController.act = function(source, creep)
{
    let result = false;

    // will drop on ground if not enough free space
    if (creep.store.getFreeCapacity() > 0)
    {
        result = creep.harvest(source) == OK;
    }

    return result;
};

energyHarvestController.targets = function(room)
{
    return room.find(FIND_SOURCES_ACTIVE);
};

energyHarvestController.filterCreep = function(creep)
{
    // STRATEGY harvest with empty only, reduce runs to sources
    if (creep.memory.hvst == true && creep.store.getUsedCapacity() == 0)
    {
        return true;
    }

    return false;
};

energyHarvestController.register();

module.exports = energyHarvestController;
