'use strict';

var globals    = require('globals');
var Controller = require('controller.template');

var mineralRestockController = new Controller('mineral.restock');

mineralRestockController.actRange = 1;

mineralRestockController.act = function(withStore, creep)
{
    for (const resourceType in creep.store)
    {
        const rc = this.wrapIntent(creep, 'transfer', withStore, resourceType);
        if (rc != OK) return rc;
    }

    // if here then all transfers were OK
    // thus do not keep at target
    return globals.WARN_LAST_INTENT;
};

mineralRestockController._checkStore = function(structure)
{
    if (structure && structure.isActiveSimple())
    {
        return structure.store.getFreeCapacity() > 0;
    }

    return false;
};

mineralRestockController.targets = function(room)
{
    // STRATEGY what to fill first
    if (this._checkStore(room.terminal)) return [ room.terminal ];
    if (this._checkStore(room.storage))  return [ room.storage ];

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
