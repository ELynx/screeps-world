'use strict';

var Controller = require('controller.template');

var energyHarvestController = new Controller('energy.harvest');

// special for this controller, varying strategy
energyHarvestController.hasRestockers = undefined;

energyHarvestController.actRange = 1;

energyHarvestController.smartTargeting = true; // since sources are crowded

energyHarvestController.observeAllCreeps = function(creeps)
{
    this.hasRestockers = this.checkRestockers(creeps);
};

energyHarvestController.act = function(source, creep)
{
    var result = false;

    // will drop on ground if not enough free space
    // maybe was checked by hotplug in room code
    if (creep._sumcarry_   < creep.carryCapacity ||
        _.sum(creep.carry) < creep.carryCapacity)
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
     // STRATEGY don't run restockable creeps to source if there are restockers
    if (this.hasRestockers && creep.memory.rstk == false)
    {
        return false;
    }

    // STRATEGY harvest with empty only, reduce runs to sources
    // maybe was checked by hotplug in room code
    if (creep.memory.hvst == true && (creep._sumcarry_ == 0 || _.sum(creep.carry) == 0))
    {
        return true;
    }

    return false;
};

energyHarvestController.register();

module.exports = energyHarvestController;
