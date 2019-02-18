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
    const harvesters = room.find(FIND_MY_CREEPS,
        {
            filter: function(creep)
            {
                return creep.memory.hvst;
            }
        }
    );

    var hasRestockers = false;
    for (var i = 0; i < harvesters.length && !hasRestockers; ++i)
    {
        hasRestockers = harvesters[i].memory.rstk == true;
    }

    this.debugLine(room, 'Restockers found: ' + hasRestockers);

    var result = [];
    for (var i = 0; i < harvesters.length; ++i)
    {
        var creep = harvesters[i];

        // STRATEGY don't run restockable creeps if there are restockers present
        if (hasRestockers && creep.memory.rstk == false)
        {
            continue;
        }

        if (globals.creepNotAssigned(creep) && (creep.carry.energy > 0))
        {
            result = result.concat(creep);
        }
    }

    return result;
};

module.exports = energyRestockController;
