'use strict';

var globals = require('globals');
var Controller = require('controller.template');

var energyHarvestController = new Controller('energy.harvest');

// special for this controller, varying strategy
energyHarvestController.hasRestockers = undefined;

energyHarvestController.actRange = 1;

energyHarvestController.roomPrepare = function(room)
{
    this._canTake_ = { };

    // TODO because cache is cleared much later
    var sources = this.staticTargets(room);

    for (var i = 0; i < sources.length; ++i)
    {
        // hotplug
        const canTake = globals.walkableTiles(sources[i]);
        this._canTake_[sources[i].id] = canTake;
    }

    this._staticTargetCache = sources;
};

energyHarvestController.observeAllCreeps = function(creeps)
{
    this.hasRestockers = this.checkRestockers(creeps);

    for (var i = 0; i < creeps.length; ++i)
    {
        const creep = creeps[i];

        if (creep.memory.ctrl == this.id)
        {
            // hotplug
            const canTake = this._canTake_[creep.memory.dest] - 1;
            this._canTake_[creep.memory.dest] = canTake;
        }
    }
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
