'use strict';

var Controller = require('controller.template');

var energyRestockController = new Controller('energy.restock');

// STRATEGY coefficient for restocking
const DynamicRestock = 0.1;
const TowerRestock   = 0.9;

// special for this controller, varying strategy
energyRestockController.hasRestockers = undefined;
energyRestockController.restockable = undefined;

energyRestockController.roomPrepare = function(room)
{
    this._prepareExcludedTargets(room);
};

energyRestockController.observeMyCreep = function(creep)
{
    this._excludeTarget(creep);
};

energyRestockController.observeAllCreeps = function(creeps)
{
    this.hasRestockers = this.checkRestockers(creeps);
    this.restockable = [];

    for (var i = 0; i < creeps.length; ++i)
    {
        if (creeps[i].memory.rstk == false)
        {
            this.restockable.push(creeps[i]);
        }
    }
};

energyRestockController.act = function(target, creep)
{
    return creep.transfer(target, RESOURCE_ENERGY) == OK;
};

energyRestockController.staticTargets = function(room)
{
    var result = [];

    if (this.hasRestockers && this.restockable.length > 0)
    {
        for (var i = 0; i < this.restockable.length; ++i)
        {
            const creep = this.restockable[i];
            const capacityThreshold = /*Math.ceil(*/DynamicRestock * creep.carryCapacity/*)*/;

            if (creep._sumcarry_   < capacityThreshold ||
                _.sum(creep.carry) < capacityThreshold)
            {
                result.push(creep);
            }
        }
    }

    return result;
};

energyRestockController.dynamicTargets = function(room, creep)
{
    return this._lookAroundCreep(
        room,
        LOOK_STRUCTURES,
        function(structure)
        {
            if (!structure.my)
            {
                return false;
            }

            if (structure.structureType == STRUCTURE_SPAWN ||
                structure.structureType == STRUCTURE_EXTENSION)
            {
                return structure.energy < structure.energyCapacity;
            }
            else if (structure.structureType == STRUCTURE_TOWER)
            {
                return structure.energy < /*Math.ceil(*/TowerRestock * structure.energyCapacity/*)*/;
            }

            return false;
        },
        creep
    );
};

energyRestockController.filterCreep = function(creep)
{
    if (this.hasRestockers && creep.memory.rstk == false)
    {
        return false;
    }

    return this._creepHasEnergy(creep);
};

energyRestockController.register();

module.exports = energyRestockController;
