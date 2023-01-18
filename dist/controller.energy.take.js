'use strict';

var Controller = require('controller.template');

// TODO merge with harvest
var energyTakeController = new Controller('energy.take');

energyTakeController.actRange = 1;

energyTakeController.wantToKeep = function(structure)
{
    // TODO global constant
    if (structure.structureType == STRUCTURE_TERMINAL) return 300;

    return -1; // to the last drop
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

    const checkedWant = creep.store.getFreeCapacity(RESOURCE_ENERGY);

    return has - toKeep >= othersWant + checkedWant;
};

energyTakeController.staticTargets = function(room)
{
    return room.find(
        FIND_STRUCTURES,
        {
            filter: _.bind(
                function(structure)
                {
                    const toKeep = this.wantToKeep(structure);

                    if (structure.structureType == STRUCTURE_CONTAINER ||
                        structure.structureType == STRUCTURE_STORAGE ||
                        // STRATEGY allow to take from terminal, maybe airdrop energy
                        structure.structureType == STRUCTURE_TERMINAL)
                    {
                        return structure.store[RESOURCE_ENERGY] > toKeep;
                    }
                    else if (structure.structureType == STRUCTURE_LINK)
                    {
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
    // not specialists
    if (creep.memory.rstk || creep.memory.minr)
    {
        return false;
    }

    // is empty
    return creep.store.getUsedCapacity() == 0;
};

energyTakeController.register();

module.exports = energyTakeController;
