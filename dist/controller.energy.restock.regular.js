'use strict';

var Controller = require('controller.template');

var energyRestockControllerRegular = new Controller('energy.restock.regular');

// STRATEGY parameters for restocking
const TowerRestockMult = 0.9;
const TerminalRestock  = 300;

energyRestockControllerRegular.actRange = 1;

energyRestockControllerRegular.roomPrepare = function(room)
{
    this._prepareExcludedTargets(room);
};

energyRestockControllerRegular.observeMyCreep = function(creep)
{
    this._excludeTarget(creep);
};

energyRestockControllerRegular.act = function(target, creep)
{
    creep.transfer(target, RESOURCE_ENERGY);

    return false;
};

energyRestockControllerRegular.staticTargets = function(room)
{
    return room.find(
        FIND_STRUCTURES,
        {
            filter: function(structure)
            {
                if (!structure.my)
                {
                    return false;
                }

                if (!structure.isActiveSimple())
                {
                    return false;
                }

                if (structure.structureType == STRUCTURE_SPAWN ||
                    structure.structureType == STRUCTURE_EXTENSION)
                {
                    return structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                }
                else if (structure.structureType == STRUCTURE_TOWER)
                {
                    return structure.store.getUsedCapacity(RESOURCE_ENERGY) < TowerRestockMult * structure.store.getCapacity(RESOURCE_ENERGY);
                }
                else if (structure.structureType == STRUCTURE_TERMINAL)
                {
                    return structure.store.getUsedCapacity(RESOURCE_ENERGY) < TerminalRestock;
                }

                return false;              
            }
        }
    );
};

energyRestockControllerRegular.filterCreep = function(creep)
{
    // rely on specialist controller grabbing restockers first
    if (creep.memory.minr)
    {
        return false;
    }

    return creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
};

energyRestockControllerRegular.register();

module.exports = energyRestockControllerRegular;
