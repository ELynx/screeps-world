'use strict';

var Controller = require('controller.template');

var energyTakeController = new Controller('energy.take');

energyTakeController.actRange = 1;

energyTakeController.wantToKeep = function(structure)
{
    const room = structure.room;

    // actual, if not defined then shadow, otherwise grab
    if (structure.structureType == STRUCTURE_TERMINAL) return room.memory.trme || (room.memory._trme || 0);
    if (structure.structureType == STRUCTURE_STORAGE)  return room.memory.stre || (room.memory._stre || 0);

    return 0;
};

energyTakeController.act = function(structure, creep)
{
    const has    = structure.store.getUsedCapacity(RESOURCE_ENERGY);
    const toKeep = this.wantToKeep(structure);
    const want   = creep.store.getFreeCapacity(RESOURCE_ENERGY);

    const howMuch = has - toKeep >= want ? undefined : has - toKeep;

    return this.wrapIntent(creep, 'withdraw', structure, howMuch);
};

energyTakeController.validateTarget = function(target, creep)
{
    // don't run across the map
    if (creep.pos.getRangeTo(target) > 10) return false;

    const has    = target.store[RESOURCE_ENERGY];
    const toKeep = this.wantToKeep(target);

    let othersWant = 0;
    const others = this._allAssignedTo(target);
    for (let i = 0; i < others.length; ++i)
    {
        const other = others[i];
        othersWant += other.store.getFreeCapacity(RESOURCE_ENERGY);
    }

    // can fit one more draw
    return has - toKeep - othersWant > 0;
};

energyTakeController.targets = function(room)
{
    return room.find(
        FIND_STRUCTURES,
        {
            filter: _.bind(
                function(structure)
                {
                    // toKeep is duplicate, but prevent excess calls to a function
                    if (structure.structureType == STRUCTURE_CONTAINER ||
                        structure.structureType == STRUCTURE_STORAGE ||
                        // STRATEGY allow to take from terminal, maybe airdrop energy
                        structure.structureType == STRUCTURE_TERMINAL)
                    {
                        const toKeep = this.wantToKeep(structure);
                        return structure.store[RESOURCE_ENERGY] > toKeep;
                    }
                    else if (structure.structureType == STRUCTURE_LINK)
                    {
                        const toKeep = this.wantToKeep(structure);
                        if (structure.store[RESOURCE_ENERGY] > toKeep)
                        {
                            // STRATEGY do not steal from source
                            return !structure.isSource();
                        }

                        return false;
                    }

                    return false;
                },
                this
            )
        }
    );
};

energyTakeController.filterCreep = function(creep)
{
    // not restocker
    if (creep.memory.rstk == true) return false;

    return this._isHarvestAble(creep);
};

energyTakeController.register();

module.exports = energyTakeController;
