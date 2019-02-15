var spawnController = require('controller.spawn');
var energyHarvestController = require('controller.energy.harvest');
var energyRestockController = require('controller.energy.restock');

var sourceActor = require('actor.source');
var restockActor = require('actor.restock');

var globals = require('globals');

/**
@param {Object} destination object
@param {Creep} creep
@return True if creep was acted upon
**/
const mapActors = function(destination, creep)
{
    const actors = [sourceActor, restockActor];

    for (var i = 0; i < actors.length; ++i)
    {
        if (actors[i].canHandle(destination))
        {
            return actors[i].act(destination, creep);
        }
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
        globals.roomDebugReset();

        spawnController.control(room);

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
                    var keepDestination = false;

                    const destination = globals.creepTarget(creep);

                    if (destination)
                    {
                        if (creep.pos.isNearTo(destination))
                        {
                            keepDestination = mapActors(destination, creep);
                        }
                        else
                        {
                            if (creep.fatigue > 0)
                            {
                                keepDestination = true;
                            }
                            else
                            {
                                keepDestination = creep.moveTo(destination, { visualizePathStyle : { } }) == OK;
                            }
                        }
                    }

                    if (!keepDestination)
                    {
                        globals.creepUnassing(creep);
                    }
                }
            }
        }

        energyHarvestController.control(room);
        energyRestockController.control(room);
    }
};

module.exports = roomActor;
