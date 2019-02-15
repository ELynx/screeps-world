var spawnController = require('controller.spawn');

var sourceActor     = require('actor.source');
var refillActor     = require('actor.refill');

var globals            = require('globals');

// helpers

/**
@param {Object} destination object
@param {Creep} creep
@return True if creep was acted upon
**/
const mapActors = function(destination, creep)
{
    if (sourceActor.canHandle(destination))
    {
        return sourceActor.act(destination, creep);
    }

    if (refillActor.canHandle(destination))
    {
        return refillActor.act(destination, creep);
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

        var activeCreeps = room.find(FIND_MY_CREEPS);

        spawnController.control(room, activeCreeps);

        // not a controller because it will be more glue and callbacks than work
        {
            // TODO SO HARDCODE
            const spawn = room.find(FIND_MY_SPAWNS)[0];
            const source = spawn.pos.findClosestByPath(FIND_SOURCES_ACTIVE);

            for (var i = 0; i < activeCreeps.length; ++i)
            {
                // performance loss, but only for small number of access
                var creep = activeCreeps[i];

                // TODO chicken and egg, control and release

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

                // now check for new destination
                if (creep.memory.dest == globals.NO_DESTINATION)
                {
                    if (creep.carry.energy < creep.carryCapacity)
                    {
                        creep.memory.dest = source.id;
                    }
                    else
                    {
                        creep.memory.dest = spawn.id;
                    }
                }
            }
        }
    }
};

module.exports = roomActor;
