var spawnController     = require('controller.spawn');
var energyController    = require('controller.energy');

var sourceActor         = require('actor.source');
var refillActor         = require('actor.refill');

var globals             = require('globals');

/**
@param {Object} destination object
@param {Creep} creep
@return True if creep was acted upon
**/
const mapActors = function(destination, creep)
{
    const actors = [sourceActor, refillActor];

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
        globals.DEBUG_VISUAL_X = globals.DEBUG_VISUAL_X0;

        var myCreeps = room.find(FIND_MY_CREEPS);

        spawnController.control(room, myCreeps);

        // not a controller because it will be more glue and callbacks than work
        {
            for (var i = 0; i < myCreeps.length; ++i)
            {
                // performance loss, but only for small number of access
                var creep = myCreeps[i];

                // creep has valid destination
                if (creep.memory.dest != globals.NO_DESTINATION)
                {
                    var keepDestination = false;

                    const destination = Game.getObjectById(creep.memory.dest);

                    if (destination)
                    {
                        if (creep.pos.isNearTo(destination))
                        {
                            keepDestination = mapActors(destination, creep);
                        }
                        else
                        {
                            keepDestination = creep.moveTo(destination, { visualizePathStyle : { } }) == OK;
                        }
                    }

                    if (!keepDestination)
                    {
                        creep.memory.dest = globals.NO_DESTINATION;
                    }
                }
            }
        }

        energyController.control(room, myCreeps);
    }
};

module.exports = roomActor;
