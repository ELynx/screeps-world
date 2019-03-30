'use strict';

var Controller = require('controller.template');

var mineralHarvestController = new Controller('mineral.harvest');

mineralHarvestController.actRange = 1;

mineralHarvestController.act = function(extractor, creep)
{
    var result = false;

    // will drop on ground if not enough free space
    if (creep.sumCarry() < creep.carryCapacity)
    {
        // STRATEGY wait for full carry
        if (extractor.cooldown > 0)
        {
            return true;
        }

        result = creep.harvest(extractor) == OK;
    }

    return result;
};

mineralHarvestController.staticTargets = function(room)
{
    return room.find(
        FIND_MY_STRUCTURES,
        {
            filter: function(structure)
            {
                return structure.structureType == STRUCTURE_EXTRACTOR && structure.my && structure.isActive();
            }
        }
    );
};

mineralHarvestController.filterCreep = function(creep)
{
    if (creep.memory.minr == true && creep.sumCarry() == 0)
    {
        return true;
    }

    return false;
};

mineralHarvestController.register();

module.exports = mineralHarvestController;
