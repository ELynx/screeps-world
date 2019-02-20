var globals = require('globals');
var Controller = require('controller.template');

var energyHarvestController = new Controller('energy.harvest');

energyHarvestController.act = function(source, creep)
{
    var result = false;

    // TODO no error code for this?
    if (_.sum(creep.carry) < creep.carryCapacity)
    {
        result = creep.harvest(source) == OK;
    }

    return result;
};

energyHarvestController.findTargets = function(room)
{
    return room.find(FIND_SOURCES_ACTIVE);
};

energyHarvestController.findCreeps = function(creeps)
{
    var result = [];

    for (var i = 0; i < creeps.length; ++i)
    {
        const creep = creeps[i];

         // STRATEGY don't run restockable creeps to source if there are restockers
        if (globals.loopCache[creep.room.id].hasRestockers && creep.memory.rstk == false)
        {
            continue;
        }

        // STRATEGY harvest with empty only, reduce runs to sources
        if (creep.memory.hvst && globals.creepNotAssigned(creep) && (_.sum(creep.carry) == 0))
        {
            result.push(creep);
        }
}

    return result;
};

module.exports = energyHarvestController;
