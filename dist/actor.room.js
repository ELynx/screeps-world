var spawnController = require('controller.spawn');
var energyHarvestController = require('controller.energy.harvest');
var energyRestockController = require('controller.energy.restock');
var buildController = require('controller.build');
var controllerController = require('controller.controller');

var globals = require('globals');

/**
@param {Object} destination object
@param {Creep} creep
@return True if creep was acted upon
**/
const mapActors = function(destination, creep)
{
    // FIXME [bugs: 1] map of <id, object reference>

    if (creep.memory.ctrl == energyHarvestController.id)
    {
        return energyHarvestController.act(destination, creep);
    }

    if (creep.memory.ctrl == energyRestockController.id)
    {
        return energyRestockController.act(destination, creep);
    }

    if (creep.memory.ctrl == buildController.id)
    {
        return buildController.act(destination, creep);
    }

    if (creep.memory.ctrl == controllerController.id)
    {
        return controllerController.act(destination, creep);
    }

    return false;
};

var roomActor =
{
    /**
    @param {Room} room
    **/
    act: function(room)
    {
        spawnController.control(room);

        // TODO helpers

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

            room.memory.hasRestockers = hasRestockers;
        }

        // not a controller because it will be more glue and callbacks than work
        {
            var myCreeps = room.find(FIND_MY_CREEPS);

            for (var i = 0; i < myCreeps.length; ++i)
            {
                // performance loss, but only for small number of access
                var creep = myCreeps[i];

                // creep has valid destination
                if (globals.creepAssigned(creep))
                {
                    var keepAssignment = false;

                    const destination = globals.creepTarget(creep);

                    if (destination)
                    {
                        if (creep.pos.inRangeTo(destination, creep.memory.actd))
                        {
                            keepAssignment = mapActors(destination, creep);
                        }
                        else
                        {
                            if (creep.fatigue > 0)
                            {
                                keepAssignment = true;
                            }
                            else
                            {
                                keepAssignment = creep.moveTo(destination) == OK;
                            }
                        }
                    }

                    if (!keepAssignment)
                    {
                        globals.unassignCreep(creep);
                    }
                }
            }
        }

        // TODO 'for all actors'
        energyHarvestController.control(room);
        energyRestockController.control(room);
        buildController.control(room);
        controllerController.control(room);
    }
};

module.exports = roomActor;
