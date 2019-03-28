'use strict';

var Controller = require('controller.template');

var energyRestockControllerRegular = new Controller('energy.restock.regular');

// STRATEGY coefficients for restocking
const TowerRestock     = 0.9;

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
            if (!structure.my)
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

            return false;
        },
        creep
    );
};

energyRestockControllerRegular.register();

module.exports = energyRestockControllerRegular;
