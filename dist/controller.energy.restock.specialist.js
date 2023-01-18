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

    return false;
};

energyRestockControllerSpecialist.targets = function(room)
{
    const sourceLinks = room.find(
        FIND_STRUCTURES,
        {
            filter: function(structure)
            {
                if (structure.structureType == STRUCTURE_LINK)
                {
                    return structure.my &&
                           structure.store.getUsedCapacity(RESOURCE_ENERGY) < LinkRestock * structure.store.getCapacity(RESOURCE_ENERGY) &&
                           structure.isActiveSimple() &&
                           structure.isSource();
                }

                return false;
            }
        }
    );

    if (sourceLinks.length > 0) return sourceLinks;

    return room.find(
        FIND_STRUCTURES,
        {
            filter: function(structure)
            {
                if (structure.structureType == STRUCTURE_CONTAINER)
                {
                    return structure.store.getUsedCapacity(RESOURCE_ENERGY) < ContainerRestock * structure.store.getCapacity(RESOURCE_ENERGY);
                }

                return false;
            }
        }
    );
};

energyRestockControllerSpecialist.filterCreep = function(creep)
{
    return creep.memory.rstk == true && creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
};

energyRestockControllerSpecialist.register();

module.exports = energyRestockControllerSpecialist;
