'use strict';

var Controller = require('controller.template');

var energyRestockController = new Controller('energy.restock');

const DynamicRestock = 0.1;
const TowerRestock   = 0.9;

// special for this controller, varying strategy
energyRestockController.hasRestockers = undefined;
energyRestockController.restockable = undefined;

energyRestockController.roomPrepare = function(room)
{
    this._prepareExcludedTargets(room);

    this.hasRestockers = false;
    this.restockable = [];
};

energyRestockController.observeMyCreep = function(creep)
{
    this._excludeTarget(creep);
};

energyRestockController.observeAllCreeps = function(creeps)
{
    // TODO cache for room / loop
    this.hasRestockers = this.checkRestockers(creeps);

    for (var i = 0; i < creeps.length; ++i)
    {
        if (creeps[i].memory.rstk == false)
        {
            this.restockable.push(creeps[i]);
        }
    }
};

energyRestockController.act = function(target, creep)
{
    return creep.transfer(target, RESOURCE_ENERGY) == OK;
};

energyRestockController.staticTargets = function(room)
{
    var result = room.find(FIND_MY_STRUCTURES,
        {
            filter: function(structure)
            {
                if (!structure.isActive())
                {
                    return false;
                }

                if (structure.structureType == STRUCTURE_SPAWN ||
                    structure.structureType == STRUCTURE_EXTENSION)
                {
                    return structure.energy < structure.energyCapacity;
                }

                if (structure.structureType == STRUCTURE_TOWER)
                {
                    return structure.energy < Math.ceil(TowerRestock * structure.energyCapacity);
                }

                return false;
            }
        }
    );

    if (this.hasRestockers && this.restockable.length > 0)
    {
        for (var i = 0; i < this.restockable.length; ++i)
        {
            const creep = this.restockable[i];

            if (_.sum(creep.carry) < Math.ceil(DynamicRestock * creep.carryCapacity))
            {
                result.push(creep);
            }
        }
    }

    return result;
};

energyRestockController.filterCreep = function(creep)
{
    if (this.hasRestockers && creep.memory.rstk == false)
    {
        return false;
    }

    return this._filterCreep(creep);
};

energyRestockController.register();

module.exports = energyRestockController;
