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
                return (structure.structureType == STRUCTURE_SPAWN ||
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

module.exports = energyRestockController;
