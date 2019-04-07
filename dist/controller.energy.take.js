'use strict';

var Controller = require('controller.template');

var energyTakeController = new Controller('energy.take');

energyTakeController.actRange = 1;

energyTakeController.structures = undefined;

energyTakeController.act = function(structure, creep)
{
    creep.withdraw(structure, RESOURCE_ENERGY);

    return false;
};

energyTakeController.roomPrepare = function(room)
{
    this.structures = room.find(FIND_STRUCTURES);
};

energyTakeController.dynamicTargets = function(room, creep)
{
    return _.filter(
        this.structures,
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
    // not specialists
    if (creep.memory.rstk || creep.memory.minr)
    {
        return false;
    }

    // is empty
    return creep.sumCarry() == 0;
};

energyTakeController.register();

module.exports = energyTakeController;
