'use strict';

var Controller = require('controller.template');

var energyRestockControllerSpecialist = new Controller('energy.restock.specialist');

// STRATEGY coefficients for restocking
const ContainerRestock = 0.99;
const LinkRestock      = 0.99;

// special for this controller, varying strategy
energyRestockControllerSpecialist.actRange = 1;

energyRestockControllerSpecialist.act = function(target, creep)
{
    creep.transfer(target, RESOURCE_ENERGY);

    return false;
};

energyRestockControllerSpecialist.dynamicTargets = function(room, creep)
{
    return this._lookAroundCreep(
        room,
        LOOK_STRUCTURES,
        function(structure)
        {
            if (!structure.my && structure.structureType != STRUCTURE_CONTAINER)
            {
                return false;
            }

            if (structure.structureType == STRUCTURE_CONTAINER)
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
};

energyRestockControllerSpecialist.filterCreep = function(creep)
{
    return creep.memory.rstk == true && creep.hasEnergy();
};

energyRestockControllerSpecialist.tiebreaker = function(struct1, struct2)
{
    return 0;
};

energyRestockControllerSpecialist.register();

module.exports = energyRestockControllerSpecialist;
