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
    return room.find(
        FIND_STRUCTURES,
        function(structure)
        {
            if (structure.structureType == STRUCTURE_CONTAINER)
            {
                return structure.store.getUsedCapacity(RESOURCE_ENERGY) < ContainerRestock * structure.store.getCapacity(RESOURCE_ENERGY);
            }
            else if (structure.structureType == STRUCTURE_LINK)
            {
                return structure.my &&
                       structure.store.getUsedCapacity(RESOURCE_ENERGY) < LinkRestock * structure.store.getCapacity(RESOURCE_ENERGY) &&
                       structure.isActiveSimple() &&
                       structure.isSource();
            }

            return false;
        }
    );
};

energyRestockControllerSpecialist.filterCreep = function(creep)
{
    return creep.memory.rstk == true && creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
};

energyRestockControllerSpecialist.tiebreaker = function(struct1, struct2)
{
    if (struct1.structureType != struct2.structureType)
    {
        return struct1.structureType == STRUCTURE_LINK ? -1 : 1;
    }

    // only same-type structures below

    // STRATEGY balance containers
    return struct1.store.getUsedCapacity(RESOURCE_ENERGY) - struct2.store.getUsedCapacity(RESOURCE_ENERGY);
};

energyRestockControllerSpecialist.register();

module.exports = energyRestockControllerSpecialist;
