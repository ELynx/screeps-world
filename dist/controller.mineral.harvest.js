'use strict';

var Controller = require('controller.template');

var mineralHarvestController = new Controller('mineral.harvest');

mineralHarvestController.actRange = 1;

mineralHarvestController.act = function(extractor, creep)
{
    let result = false;

    // will drop on ground if not enough free space
    if (creep.store.getFreeCapacity() > 0)
    {
        // STRATEGY wait for full carry
        if (extractor.cooldown > 0)
        {
            result = true;
        }
        else
        {
            const minerals = extractor.pos.lookFor(LOOK_MINERALS);
            for (let i = 0; i < minerals.length; ++i)
            {
                const mineral = minerals[i];

                if (mineral.mineralAmount == 0)
                {
                    continue;
                }

                const rc = creep.harvest(mineral);
                result = rc == OK;
            }

            if (!result)
            {
                extractor.room.memory.mlvl = 0;
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
                return structure.structureType == STRUCTURE_EXTRACTOR && structure.isActiveSimple();
            }
        }
    );
};

mineralHarvestController.filterCreep = function(creep)
{
    if (creep.memory.minr == true && creep.store.getUsedCapacity() == 0)
    {
        return true;
    }

    return false;
};

mineralHarvestController.register();

module.exports = mineralHarvestController;
