'use strict';

var Controller = require('controller.template');

// TODO merge with harvest
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
            if (structure.structureType == STRUCTURE_CONTAINER ||
                structure.structureType == STRUCTURE_STORAGE)
            {
                return structure.store[RESOURCE_ENERGY] > 0;
            }
            else if (structure.structureType == STRUCTURE_LINK)
            {
                if (structure.store[RESOURCE_ENERGY] == 0)
                {
                    return false;
                }

                // STRATEGY do not steal from source
                if (structure.isSource())
                {
                    return false;
                }

                // STRATEGY do not visit link across the map
                return structure.pos.inRangeTo(creep.pos, 5);
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
    return creep.store.getUsedCapacity() == 0;
};

energyTakeController.register();

module.exports = energyTakeController;
