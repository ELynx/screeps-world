var globals = require('globals');
var Controller = require('controller.template');

var energyRestockController = new Controller('energy.restock');

energyRestockController.act = function(target, creep)
{
    return creep.transfer(target, RESOURCE_ENERGY) == OK;
};

energyRestockController.targets = function(room)
{
    const structs = room.find(FIND_MY_STRUCTURES,
        {
            filter: function(structure)
            {
                // TODO laboratory
                return structure.isActive() &&
                      (structure.structureType == STRUCTURE_SPAWN ||
                       structure.structureType == STRUCTURE_EXTENSION ||
                       structure.structureType == STRUCTURE_TOWER) &&
                       structure.energy < structure.energyCapacity;
            }
        }
    );

    if (!room.memory.hasRestockers)
    {
        return structs;
    }

    const creeps = room.find(FIND_MY_CREEPS,
        {
            filter: function(creep)
            {
                return !creep.spawning && (creep.memory.rstk == false) && (_.sum(creep.carry) < creep.carryCapacity);
            }
        }
    );

    return structs.concat(creeps);
};

energyRestockController.creeps = function(room)
{
    return room.find(FIND_MY_CREEPS,
        {
            filter: function(creep)
            {
                // STRATEGY don't run restockable creeps to do restocking
                if (room.memory.hasRestockers && creep.memory.rstk == false)
                {
                    return false;
                }

                // STRATEGY harvest with empty only, reduce runs to sources
                return !creep.spawning && globals.creepNotAssigned(creep) && (creep.carry.energy > 0);
            }
        }
    );
};

module.exports = energyRestockController;
