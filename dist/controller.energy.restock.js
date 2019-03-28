'use strict';

var Controller = require('controller.template');

var energyRestockController = new Controller('energy.restock');

// STRATEGY coefficients for restocking
const TowerRestock     = 0.9;
const ContainerRestock = 0.99;
const LinkRestock      = 0.99;

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
    // ignore specialists
    if (creep.memory.rstk == true)
    {
        return;
    }
    
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
                return structure.isActive() && structure.energy < structure.energyCapacity;
            }
            else if (structure.structureType == STRUCTURE_TOWER)
            {
                return structure.isActive() && structure.energy < TowerRestock * structure.energyCapacity;
            }
            else if (structure.structureType == STRUCTURE_CONTAINER)
            {
                return structure.store[RESOURCE_ENERGY] < ContainerRestock * structure.storeCapacity;
            }
            else if (structure.structureType == STRUCTURE_LINK)
            {
                return structure.isActive() && structure.energy < LinkRestock * structure.energyCapacity;
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

            return creep.memory.rstk == false;
        }
    );
};

energyRestockController.filterCreep = function(creep)
{
    return creep.hasEnergy();
};

energyRestockController.register();

module.exports = energyRestockController;
