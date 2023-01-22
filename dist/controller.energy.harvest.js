'use strict';

var Controller = require('controller.template');

var energyHarvestController = new Controller('energy.harvest');

energyHarvestController.actRange = 1;

energyHarvestController.ignoreCreepsForTargeting = false;

energyHarvestController.act = function(source, creep)
{
    return this.wrapIntent(creep, 'harvest', source);
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
