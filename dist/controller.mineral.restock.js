'use strict';

var Controller = require('controller.template');

var mineralHarvestController = new Controller('mineral.restock');

mineralHarvestController.actRange = 1;

mineralHarvestController.act = function(terminal, creep)
{
    let transferred = false;

    for(const resourceType in creep.carry)
    {
        // speedup, if there are more resource types
        if (transferred)
        {
            return true;
        }

        if (resourceType == RESOURCE_ENERGY && creep.carry[resourceType] == 0)
        {
            continue;
        }

        creep.transfer(terminal, resourceType);
        transferred = true;
    }

    return false;
};

mineralHarvestController.staticTargets = function(room)
{
    return room.find(
        FIND_MY_STRUCTURES,
        {
            filter: function(structure)
            {
                if (structure.structureType == STRUCTURE_TERMINAL)
                {
                    if (structure.my && structure.isActive())
                    {
                        return _.sum(structure.store) < structure.storeCapacity;
                    }
                }
            }

            return false;
        }
    );
};

mineralHarvestController.filterCreep = function(creep)
{
    if (creep.memory.minr == true)
    {
        return creep.sumCarry() > 0;
    }

    return false;
};

mineralHarvestController.register();

module.exports = mineralHarvestController;
