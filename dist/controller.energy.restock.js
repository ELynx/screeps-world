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
                return structure.isActive() &&
                      (structure.structureType == STRUCTURE_SPAWN ||
                       structure.structureType == STRUCTURE_EXTENSION ||
                       structure.structureType == STRUCTURE_TOWER) &&
                       structure.energy < structure.energyCapacity;
            }
        }
    );

    const creeps = room.find(FIND_MY_CREEPS,
        {
            filter: function(creep)
            {
                return creep.memory.rstk && !creep.spawning && (_.sum(creep.carry) < creep.carryCapacity);
            }
        }
    );

    return structs.concat(creeps);
};

energyRestockController.creeps = function(room)
{
    const hasRestockers = room.find(FIND_MY_CREEPS,
        {
            filter: function(creep)
            {
                return creep.memory.hvst && !creep.memory.rstk;
            }
        }
    ).length > 0;

    return room.find(FIND_MY_CREEPS,
        {
            filter: function(creep)
            {
                // STRATEGY don't run restockable creeps if there are restockers present
                if (hasRestockers && creep.memory.rstk)
                {
                    return false;
                }

                return globals.creepNotAssigned(creep) && creep.carry.energy > 0;
            }
        }
    );
};

module.exports = energyRestockController;
