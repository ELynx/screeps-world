'use strict';

var Controller = require('controller.template');

var mineralHarvestController = new Controller('mineral.harvest');

mineralHarvestController.actRange = 1;

mineralHarvestController.act = function(extractor, creep)
{
    let result = false;

    // will drop on ground if not enough free space
    if (creep.sumCarry() < creep.carryCapacity)
    {
        // STRATEGY wait for full carry
        if (extractor.cooldown > 0)
        {
            result = true;
        }
        else
        {
            const minerals = extractor.pos.lookFor(LOOK_MINERALS);

            if (minerals.length > 0)
            {
                let rc = creep.harvest(minerals[0]);

                if (rc == ERR_NOT_ENOUGH_RESOURCES)
                {
                    extractor.room.memory.mlvl = 0;
                }

                result = rc == OK;
            }
        }
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
    if (creep.memory.minr == true &&
        creep.sumCarry() == 0 &&
        creep.ticksToLive > 200) // TODO integrate
    {
        return true;
    }

    return false;
};

mineralHarvestController.register();

module.exports = mineralHarvestController;
