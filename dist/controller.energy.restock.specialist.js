'use strict';

var Controller = require('controller.template');

var energyRestockControllerSpecialist = new Controller('energy.restock.specialist');

// STRATEGY coefficients for restocking
const ContainerRestock = 0.99;
const LinkRestock      = 0.99;

energyRestockControllerSpecialist.actRange = 1;

energyRestockControllerSpecialist.act = function(target, creep)
{
    creep.transfer(target, RESOURCE_ENERGY);
    creep._energyUsed_ = true;

    return false;
};

energyRestockControllerSpecialist.targets = function(room)
{
    const allStructures = room.find(FIND_STRUCTURES);

    const sourceLinks = _.filter(
        allStructures,
        function(structure)
        {
            if (structure.structureType == STRUCTURE_LINK)
            {
                return structure.store.getUsedCapacity(RESOURCE_ENERGY) < LinkRestock * structure.store.getCapacity(RESOURCE_ENERGY) &&
                       structure.isActiveSimple() &&
                       structure.isSource();
            }

            return false;
        }
    );

    if (sourceLinks.length > 0) return sourceLinks;

    return _.filter(
        allStructures,
        function(structure)
        {
            if (structure.structureType == STRUCTURE_CONTAINER)
            {
                return structure.store.getUsedCapacity(RESOURCE_ENERGY) < ContainerRestock * structure.store.getCapacity(RESOURCE_ENERGY) &&
                       structure.isActiveSimple();
            }

            return false;
        }
    );
};

energyRestockControllerSpecialist.filterCreep = function(creep)
{
    return creep.memory.rstk == true && this._isWorkAble(creep);
};

energyRestockControllerSpecialist.register();

module.exports = energyRestockControllerSpecialist;
