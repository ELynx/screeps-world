var globals = require('globals');
var Controller = require('controller.template');

var energyRestockController = new Controller('energy.restock');

const DynamicRestock = 0.1;

// special for this controller, varying strategy
energyRestockController.hasRestockers = false;

/**
Set if room has restocker creeps.
@param {boolean} restockers
**/
energyRestockController.setRestockers = function(restockers)
{
    this.hasRestockers = restockers;
};

/**
Prepare for new room.
Special, unset strategy flag.
**/
energyRestockController.roomPrepare()
{
    this.targetCache = [];
    this.hasRestockers = false;
};

energyRestockController.act = function(target, creep)
{
    return creep.transfer(target, RESOURCE_ENERGY) == OK;
};

energyRestockController.findTargets = function(room)
{
    return room.find(FIND_MY_STRUCTURES,
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
};

energyRestockController.control = function(room, roomCreeps)
{
    this.debugHeader(room);

    const targets = this.findTargets(room);

    var creepTargets = [];
    var creepRestockers = [];

    for (var i = 0; i < roomCreeps.length; ++i)
    {
        const creep = roomCreeps[i];

        if (this.hasRestockers && creep.memory.rstk == false)
        {
            if (_.sum(creep.carry) < Math.ceil(DynamicRestock * creep.carryCapacity))
            {
                creepTargets.push(creep);
            }
        }
        else
        {
            if (globals.creepNotAssigned(creep) && (creep.carry.energy > 0))
            {
                creepRestockers.push(creep);
            }
        }
    }

    this.creepsToTargets(room, targets.concat(creepTargets), creepRestockers);
}

module.exports = energyRestockController;
