'use strict';

var Controller = require('controller.template');

var energyTakeController = new Controller('energy.take');

energyTakeController.actRange = 1;

energyTakeController.wantToKeep = function(structure)
{
    const room = structure.room;

    if (structure.structureType == STRUCTURE_TERMINAL) return room.memory.trme || 0;
    if (structure.structureType == STRUCTURE_STORAGE)  return room.memory.stre || 0;

    return 0;
};

energyTakeController.act = function(structure, creep)
{
    const has    = structure.store[RESOURCE_ENERGY];
    const toKeep = this.wantToKeep(structure);
    const want   = creep.store.getFreeCapacity(RESOURCE_ENERGY);

    const howMuch = has - toKeep >= want ? undefined : has - toKeep;

    creep.withdraw(structure, RESOURCE_ENERGY, howMuch);

    return false;
};

energyTakeController.validateTarget = function(target, creep)
{
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
    if (creep.memory.rstk) return false;

    return this._isEmpty(creep) && this._hasWCM(creep);
};

energyTakeController.register();

module.exports = energyTakeController;
