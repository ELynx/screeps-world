var spawnActor      = require('actor.spawn');
var sourceActor     = require('actor.source');
var refillActor     = require('actor.refill');

// TODO single place
// constants
const NO_DESTINATION = '';

// parameters
const TargetCreepCount = 4;

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
        var activeCreeps = room.find(FIND_MY_CREEPS);

        // TODO actual strategy controller
        {
            var creepsBalance = TargetCreepCount - activeCreeps.length;

            if (creepsBalance > 0)
            {
                const bodyType = [MOVE, CARRY, WORK];

                var spawns = room.find(FIND_MY_SPAWNS);

                for (var i = 0; i < spawns.length && creepsBalance > 0; ++i)
                {
                    if (spawnActor.act(spawns[i], bodyType))
                    {
                        --creepsBalance;
                    }
                }
            }

            const textProp = { align: 'left' };

            room.visual.text('Target creep cout ' + TargetCreepCount,       40, 0, textProp);
            room.visual.text('Actual creep count ' + activeCreeps.length,   40, 1, textProp);
            room.visual.text('Queued creep count [TODO]',                   40, 2, textProp);
        }

        // TODO actual behavior controller
        {
            // TODO SO HARDCODE
            const spawn = room.find(FIND_MY_SPAWNS)[0];
            const source = spawn.pos.findClosestByPath(FIND_SOURCES);

            for (var i = 0; i < activeCreeps.length; ++i)
            {
                // TODO is this a performance loss?
                var creep = activeCreeps[i];

                // TODO chicken and egg, control or release

                if (creep.memory.dest !== NO_DESTINATION)
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
                        creep.memory.dest = NO_DESTINATION;
                    }
                }

                // now check for new destination
                if (creep.memory.dest === NO_DESTINATION)
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
