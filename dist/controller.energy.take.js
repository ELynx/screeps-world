'use strict';

var Controller = require('controller.template');

// TODO merge with harvest
var energyTakeController = new Controller('energy.take');

energyTakeController.actRange = 1;

energyTakeController.act = function(structure, creep)
{
    creep.withdraw(structure, RESOURCE_ENERGY);

    return false;
};

energyTakeController.wantToKeep = function(structure)
{
    // TODO global constant
    if (structure.structureType == STRUCTURE_TERMINAL) return 300;

    return -1; // to the last drop
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
        othersWant += other.getFreeCapacity(RESOURCE_ENERGY);
    }

    const checkedWant = creep.getFreeCapacity(RESOURCE_ENERGY);

    return has - toKeep >= othersWant + checkedWant;
};

energyTakeController.staticTargets = function(room)
{
    return room.find(
        FIND_STRUCTURES,
        {
            filter: function(structure)
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
            }
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
