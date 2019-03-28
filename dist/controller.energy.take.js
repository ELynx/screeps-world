'use strict';

var Controller = require('controller.template');

var energyTakeController = new Controller('energy.take');

energyTakeController.actRange = 1;

energyTakeController.act = function(structure, creep)
{
    creep.withdraw(structure, RESOURCE_ENERGY);

    return false;
};

energyTakeController.dynamicTargets = function(room, creep)
{
    const structures = room.find(FIND_STRUCTURES);

    // TODO limit grabbing per structure
    return _.filter(
        structures,
        function(structure)
        {
            if (structure.structureType == STRUCTURE_CONTAINER)
            {
                return structure.store[RESOURCE_ENERGY] > 0;
            }

            if (structure.structureType == STRUCTURE_LINK)
            {
                return structure.energy > 0;
            }

            return false;
        }
    );
};

energyTakeController.filterCreep = function(creep)
{
    // creeps that do not do restocking and empty
    if (creep.memory.rstk == false && creep.sumCarry() == 0)
    {
        return true;
    }

    return false;
};

energyTakeController.register();

module.exports = energyTakeController;
