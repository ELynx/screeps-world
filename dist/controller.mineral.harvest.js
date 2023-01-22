'use strict';

var Controller = require('controller.template');

var mineralHarvestController = new Controller('mineral.harvest');

mineralHarvestController.actRange = 1;

mineralHarvestController.act = function(extractor, creep)
{
    // STRATEGY wait for full take, keep on target
    if (extractor.cooldown > 0) return OK;

    const minerals = extractor.pos.lookFor(LOOK_MINERALS);
    for (let i = 0; i < minerals.length; ++i)
    {
        const mineral = minerals[i];
        const rc = this.wrapIntent(creep, 'harvest', mineral);
        if (rc == ERR_NOT_ENOUGH_RESOURCES)
        {
            extractor.room.memory.mlvl = 0;
        }

        return rc;
    }

    return ERR_INVALID_TARGET;
};

mineralHarvestController.targets = function(room)
{
    if (room.memory.mlvl == 0) return [];

    return room.find(
        FIND_STRUCTURES,
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
    return creep.memory.minr == true && this._isHarvestAble(creep);
};

mineralHarvestController.register();

module.exports = mineralHarvestController;
