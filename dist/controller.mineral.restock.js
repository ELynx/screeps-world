'use strict';

var Controller = require('controller.template');

var mineralHarvestController = new Controller('mineral.restock');

mineralHarvestController.actRange = 1;

mineralHarvestController.act = function(terminal, creep)
{
    let transferred = false;

    for(const resourceType in creep.store)
    {
        // speedup, if there are more resource types
        if (transferred)
        {
            return true;
        }

        if (resourceType == RESOURCE_ENERGY && creep.store[resourceType] == 0)
        {
            continue;
        }

        let canReceive = terminal.store.getFreeCapacity(resourceType);
        if (canReceive == 0)
        {
            terminal.room.memory.mlvl = 0;
        }
        else
        {
            const rc = creep.transfer(terminal, resourceType);

            if (rc != OK)
            {
                return false;
            }

            transferred = true;
        }
    }

    return false;
};

mineralHarvestController._checkStorage = function(structure)
{
    if (structure &&
        structure.my &&
        structure.isActiveSimple())
    {
        return structure.store.getFreeCapacity() > 0;
    }

    return false;
};

mineralHarvestController.targets = function(room)
{
    if (this._checkStorage(room.terminal)) return [ room.terminal ];
    if (this._checkStorage(room.storage))  return [ room.storage ];

    return [];
};

mineralHarvestController.filterCreep = function(creep)
{
    if (creep.memory.minr == true)
    {
        return creep.store.getUsedCapacity() > 0;
    }

    return false;
};

mineralHarvestController.register();

module.exports = mineralHarvestController;
