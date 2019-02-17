var Controller = require('controller.template');

var energyRestockController = new Controller('energy.restock');

energyRestockController.act = function(structure, creep)
{
    return creep.transfer(structure, RESOURCE_ENERGY) == OK;
};

energyRestockController.targets = function(room)
{
    return room.find(FIND_MY_STRUCTURES,
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
};

module.exports = energyRestockController;
