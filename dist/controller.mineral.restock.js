'use strict';

var Controller = require('controller.template');

var mineralHarvestController = new Controller('mineral.restock');

mineralHarvestController.actRange = 1;

mineralHarvestController.act = function(terminal, creep)
{
    for(const resourceType in creep.carry)
    {
        if (resourceType == RESOURCE_ENERGY && creep.carry[resourceType] == 0)
        {
            continue;
        }

        creep.transfer(terminal, resourceType);
    }
};

mineralHarvestController.staticTargets = function(room)
{
    return room.find(
        FIND_MY_STRUCTURES,
        {
            filter: function(structure)
            {
                return structure.structureType == STRUCTURE_TERMINAL && structure.my && structure.isActive();
            }
        }
    );
};

mineralHarvestController.filterCreep = function(creep)
{
    if (creep.memory.minr == true)
    {
        return true;
    }

    return false;
};

mineralHarvestController.register();

module.exports = mineralHarvestController;
