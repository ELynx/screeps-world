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

energyHarvestController.targets = function(room)
{
    return room.find(FIND_SOURCES_ACTIVE);
};

energyHarvestController.creeps = function(room)
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

        // STRATEGY harvest with empty only, reduce runs to sources
        if (globals.creepNotAssigned(creep) && (_.sum(creep.carry) == 0))
        {
            result = result.concat(creep);
        }
    }

    return result;
};

module.exports = energyHarvestController;
