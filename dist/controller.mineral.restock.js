'use strict';

var Controller = require('controller.template');

var mineralRestockController = new Controller('mineral.restock');

mineralRestockController.actRange = 1;

mineralRestockController.act = function(withStore, creep)
{
    let transferred = false;

    for(const resourceType in creep.store)
    {
        // speedup, if there are more resource types
        if (transferred)
        {
            return true;
        }

        // TODO why such logic?
        if (resourceType == RESOURCE_ENERGY && creep.store[resourceType] == 0)
        {
            continue;
        }

        let canReceive = withStore.store.getFreeCapacity(resourceType);
        if (canReceive == 0)
        {
            continue;
        }
        else
        {
            const rc = creep.transfer(withStore, resourceType);

            if (rc != OK)
            {
                return false;
            }

            transferred = true;
        }
    }

    return false;
};

mineralRestockController._checkStorage = function(structure)
{
    if (structure && structure.isActiveSimple())
    {
        return structure.store.getFreeCapacity() > 0;
    }

    return false;
};

mineralRestockController.targets = function(room)
{
    if (this._checkStorage(room.terminal)) return [ room.terminal ];
    if (this._checkStorage(room.storage))  return [ room.storage ];

    return [];
};

mineralRestockController.filterCreep = function(creep)
{
    // STRATEGY has non-energy resouces, can walk
    if (creep.getActiveBodyparts(CARRY) > 0 &&
        creep.getActiveBodyparts(MOVE)  > 0)
    {
        const usedTotal  = creep.store.getUsedCapacity();
        const usedEnergy = creep.store.getUsedCapacity(RESOURCE_ENERGY);

        // don't bring energy
        return usedTotal > 0 && usedEnergy == 0;
    }

    return false;
};

mineralRestockController.register();

module.exports = mineralRestockController;
