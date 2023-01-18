'use strict';

var Controller = require('controller.template');

var energyRestockControllerRegular = new Controller('energy.restock.regular');

// STRATEGY parameters for restocking
const TowerRestockNormal   = 0.9;
const TowerRestockCritical = 0.25;
const TerminalRestock      = 300;

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

energyRestockControllerRegular.targets = function(room)
{
    const critical = room.find(
        FIND_STRUCTURES,
        {
            filter: function(structure)
            {
                if (structure.my && structure.isActiveSimple())
                {
                    if (structure.structureType == STRUCTURE_TOWER)
                    {
                        return structure.store.getUsedCapacity(RESOURCE_ENERGY) < TowerRestockCritical * structure.store.getCapacity(RESOURCE_ENERGY);
                    }
                }

                return false;
            }
        }
    );

    if (critical.length > 0) return critical;

    return room.find(
        FIND_STRUCTURES,
        {
            filter: function(structure)
            {
                if (structure.my && structure.isActiveSimple())
                {
                    if (structure.structureType == STRUCTURE_SPAWN ||
                        structure.structureType == STRUCTURE_EXTENSION)
                    {
                        return structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                    }
                    else if (structure.structureType == STRUCTURE_TOWER)
                    {
                        return structure.store.getUsedCapacity(RESOURCE_ENERGY) < TowerRestockNormal * structure.store.getCapacity(RESOURCE_ENERGY);
                    }
                    else if (structure.structureType == STRUCTURE_TERMINAL)
                    {
                        return structure.store.getUsedCapacity(RESOURCE_ENERGY) < TerminalRestock;
                    }
                }

                return false;
            }
        }
    );
};

energyRestockControllerRegular.register();

module.exports = energyRestockControllerRegular;
