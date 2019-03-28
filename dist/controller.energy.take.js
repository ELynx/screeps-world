'use strict';

var Controller = require('controller.template');

var energyTakeController = new Controller('energy.take');

energyTakeController.actRange = 1;

energyTakeController.act = function(structure, creep)
{
    const howMuch = creep.carryCapacity - creep.sumCarry();

    return creep.withdraw(structure, RESOURCE_ENERGY, howMuch);
};

energyTakeController.dynamicTargets = function(room, creep)
{
    // TODO limit by walking distance?
    const nearby = creep.pos.findInRange(LOOK_STRUCTURES, 10);

    return _.filter(
        nearby,
        function(structure)
        {
            if (structure.structureType == STRUCTURE_CONTAINER ||
                structure.structureType == STRUCTURE_LINK)
            {
                // TODO limit grabbing
                return structure.store[RESOURCE_ENERGY] > 0;
            }

            return false;
        }
    );
};

energyTakeController.filterCreep = function(creep)
{
    if (creep.sumCarry() == 0)
    {
        return true;
    }

    return false;
};

energyTakeController.register();

module.exports = energyTakeController;
