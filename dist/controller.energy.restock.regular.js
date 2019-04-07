'use strict';

var Controller = require('controller.template');

var energyRestockControllerRegular = new Controller('energy.restock.regular');

// STRATEGY parameters for restocking
const TowerRestockMult = 0.9;
const TerminalRestock  = 2000;

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

energyRestockControllerRegular.dynamicTargets = function(room, creep)
{
    return this._lookAroundCreep(
        room,
        LOOK_STRUCTURES,
        function(structure)
        {
            if (!structure.my ||
                !structure.isActiveCached())
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
                return structure.energy < TowerRestockMult * structure.energyCapacity;
            }
            else if (structure.structureType == STRUCTURE_TERMINAL)
            {
                return structure.store[RESOURCE_ENERGY] < TerminalRestock;
            }

            return false;
        },
        creep
    );
};

energyRestockControllerRegular.register();

module.exports = energyRestockControllerRegular;
