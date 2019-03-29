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
    const nearby = room.find(FIND_STRUCTURES);

    return _.filter(
        nearby,
        function(structure)
        {
            // TODO limit grabbing

            if (structure.structureType == STRUCTURE_CONTAINER)
            {
                return structure.store[RESOURCE_ENERGY] > 0;
            }
            else if (structure.structureType == STRUCTURE_LINK)
            {
                // STRATEGY do not steal from firing link
                if (structure.energy == 0 ||
                    structure.cooldown > 0)
                {
                    return false;
                }

                // STRATEGY do not visit link across the map
                return structure.pos.getRangeTo(creep.pos) <= 5;
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
