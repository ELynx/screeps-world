var globals = require('globals');
var Controller = require('controller.template');

var spawnController = new Controller('spawn');

// STRATEGY
// worker still can carry resources back if work is shot
// then extra legs are not necessary, and can be sacreficed
// then it is just running target
const bodyTypeSmall  = [WORK, MOVE, CARRY, MOVE];
const bodyTypeMedium = [WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE];

/**
@param {Spawn} spawn
@param {array<string>} bodyType
@return True if creep spawn initiated
**/
const doSpawn = function(spawn, bodyType)
{
    var name = 'creep_' + spawn.id + '_' + Game.time;

    if (spawn.spawnCreep(bodyType, name, { dryRun: true }) == OK)
    {
        // TODO some sane way
        // <<
        var move = 0;

        for (var i = 0; i < bodyType.length; ++i)
        {
            if (bodyType[i] == MOVE)
            {
                ++move;
            }
        }

        // if will fatigue
        var restock = bodyType.length > 2 * move;
        //

        return spawn.spawnCreep(bodyType, name,
            {
                memory:
                {
                    ctrl: globals.NO_CONTROL,
                    actd: globals.NO_ACT_DISTANCE,
                    dest: globals.NO_DESTINATION,
                    rstk: restock
                }
            }
        ) == OK;
    }

    return false;
};

spawnController.targets = function(room)
{
    return room.find(FIND_MY_SPAWNS);
};

spawnController.creeps = function(room)
{
    return room.find(FIND_MY_CREEPS);
};

spawnController.control = function(room)
{
    this.debugPing(room);

    const creeps = this.creeps(room);

    // TODO sane way
    // <<
    var targetSmall  = 4;
    var targetMedium = 2;

    for (var i = 0; i < creeps.length; ++i)
    {
        if (creeps[i].body == bodyTypeSmall)
        {
            --targetSmall;
        }
        else if (creeps[i].body == bodyTypeMedium)
        {
            --targetMedium;
        }
    }

    if (targetSmall > 0 || targetMedium > 0)
    {
        var spawns = this.targets(room);

        for (var i = 0; i < spawns.length && (targetSmall > 0 || targetMedium > 0); ++i)
        {
            if (targetSmall > 0)
            {
                if (doSpawn(spawns[i], bodyTypeSmall))
                {
                    --targetSmall;
                }
            }
            else if (targetMedium > 0)
            {
                 if (doSpawn(spawns[i], bodyTypeMedium))
                {
                    --targetMedium;
                }
            }
        }
    }
    // >>

    globals.roomDebug(room, 'Want small # ' + targetSmall);
    globals.roomDebug(room, 'Want medium # ' + targetMedium);
};

module.exports = spawnController;
