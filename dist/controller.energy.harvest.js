'use strict';

var Controller = require('controller.template');

var energyHarvestController = new Controller('energy.harvest');

energyHarvestController.actRange = 1;

energyHarvestController.ignoreCreepsForTargeting = false;

// TODO systemize
energyHarvestController.act = function(source, creep)
{
    let result = false;

    // will drop on ground if not enough free space
    if (creep.store.getFreeCapacity() > 0)
        result = creep.harvest(source) == OK;

    if (result) creep._storeUpped_ = true;

    return result;
};

energyHarvestController.targets = function(room)
{
    return room.find(FIND_SOURCES_ACTIVE);
};

energyHarvestController.filterCreep = function(creep)
{
    return this._isHarvestAble(creep);
};

energyHarvestController.register();

module.exports = energyHarvestController;
