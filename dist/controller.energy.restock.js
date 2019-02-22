var globals = require('globals');
var Controller = require('controller.template');

var energyRestockController = new Controller('energy.restock');

const DynamicRestock = 0.1;
const TowerRestock   = 0.9;

// special for this controller, varying strategy
energyRestockController.hasRestockers = undefined;
energyRestockController.restockable = undefined;

/**
Set if room has restocker creeps.
@param {boolean} restockers
**/
energyRestockController.setHasRestockers = function(restockers)
{
    this.hasRestockers = restockers;
};

/**
Add a creep as restockable
@param {Creep} creep
**/
energyRestockController.rememberRestockable = function(creep)
{
    this.restockable.push(creep);
};

/**
Prepare for new room.
Special, unset strategy flag.
**/
energyRestockController.roomPrepare()
{
    this.targetCache = [];
    this.hasRestockers = false;
    this.restockable = [];
};

energyRestockController.act = function(target, creep)
{
    return creep.transfer(target, RESOURCE_ENERGY) == OK;
};

energyRestockController.findTargets = function(room)
{
    var result = room.find(FIND_MY_STRUCTURES,
        {
            // TODO laboratory
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

energyRestockController.findCreeps = function(creeps)
{
    var result = [];

    for (var i = 0; i < creeps.length; ++i)
    {
        var creep = creeps[i];

        if (this.hasRestockers && creep.memory.rstk == false)
        {
            continue;
        }

        if (creep.carry.energy > 0)
        {
            result.push(creep);
        }
    }

    return result;
};

module.exports = energyRestockController;
