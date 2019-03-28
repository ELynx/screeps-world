'use strict';

var Controller = require('controller.template');

var energyRestockController = new Controller('energy.restock');

// STRATEGY coefficients for restocking
const TowerRestock     = 0.9;
const ContainerRestock = 0.8;
const LinkRestock      = 0.9;

// special for this controller, varying strategy
energyRestockController.hasRestockers = undefined;
energyRestockController.actRange = 1;

/**
Check for presense of restockers among creeps.
@param {array<Creep>} creeps.
**/
energyRestockController.checkRestockers = function(creeps)
{
    for (var i = 0; i < creeps.length; ++i)
    {
        if (creeps[i].memory.rstk == true)
        {
            return true;
        }
    }

    return false;
};

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
};

energyRestockController.act = function(target, creep)
{
    return creep.transfer(target, RESOURCE_ENERGY) == OK;
};

energyRestockController.dynamicTargets = function(room, creep)
{
    const nearby = this._lookAroundCreep(
        room,
        LOOK_STRUCTURES,
        function(structure)
        {
            if (!structure.my && structure.structureType != STRUCTURE_CONTAINER)
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
                return structure.energy < TowerRestock * structure.energyCapacity;
            }
            else if (structure.structureType == STRUCTURE_CONTAINER)
            {
                return structure.store[RESOURCE_ENERGY] < ContainerRestock * structure.storeCapacity;
            }
            else if (structure.structureType == STRUCTURE_LINK)
            {
                return structure.store[RESOURCE_ENERGY] < LinkRestock * structure.storeCapacity;
            }

            return false;
        },
        creep
    );

    return _.filter(
        nearby,
        function(structure)
        {
            if (structure.structureType == STRUCTURE_CONTAINER ||
                structure.structureType == STRUCTURE_LINK)
            {
                return creep.memory.rstk == true;
            }

            return true;
        }
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
