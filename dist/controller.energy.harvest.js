'use strict';

var Controller = require('controller.template');

var energyHarvestController = new Controller('energy.harvest');

energyHarvestController.actRange = 1;

energyHarvestController.ignoreCreepsForTargeting = false;

energyHarvestController.act = function(source, creep)
{
    let result = false;

    // will drop on ground if not enough free space
    if (creep.sumCarry() < creep.carryCapacity)
    {
        result = creep.harvest(source) == OK;
    }

    return result;
};

energyHarvestController.staticTargets = function(room)
{
    return room.find(FIND_SOURCES_ACTIVE);
};

energyHarvestController.filterCreep = function(creep)
{
    // STRATEGY harvest with empty only, reduce runs to sources
    if (creep.memory.hvst == true && creep.sumCarry() == 0)
    {
        return true;
    }

    return false;
};

energyHarvestController.register();

module.exports = energyHarvestController;
