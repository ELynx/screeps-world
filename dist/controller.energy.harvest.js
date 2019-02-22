var globals = require('globals');
var Controller = require('controller.template');

var energyHarvestController = new Controller('energy.harvest');

// special for this controller, varying strategy
energyHarvestController.hasRestockers = undefined;

/**
Set if room has restocker creeps.
@param {boolean} restockers
**/
energyHarvestController.setHasRestockers = function(restockers)
{
    this.hasRestockers = restockers;
};

/**
Prepare for new room.
Special, unset strategy flag.
**/
energyHarvestController.roomPrepare = function()
{
    this.targetCache = [];
    this.hasRestockers = false;
};

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

energyHarvestController.findTargets = function(room)
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
    if (creep.memory.hvst && (_.sum(creep.carry) == 0))
    {
        return true;
    }

    return false;
};

module.exports = energyHarvestController;
