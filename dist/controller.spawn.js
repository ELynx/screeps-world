var globals = require('globals');
var Controller = require('controller.template');

var spawnController = new Controller('spawn');

const universalWorker = function(level)
{
    return [WORK, MOVE, CARRY, MOVE];
};

const heavyWorker = function(level)
{
    return [WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE];
};

const TypeBody    = [ universalWorker, heavyWorker];
const TypeRestock = [ false,           true       ];
const TypeCount   = [
                    [ 0,               0          ], // level 0, no own controller
                    [ 4,               0          ], // level 1
                    [ 6,               2          ]  // level 2
                                                  ];

/**
@param {Spawn} spawn
@param {integer} type
@param {integer} level
@return True if creep spawn initiated
**/
const doSpawn = function(spawn, type, level)
{
    const name = spawn.id + '_' + Game.time;
    const bodyType = TypeBody[type](level);

    if (spawn.spawnCreep(bodyType, name, { dryRun: true }) == OK)
    {
        return spawn.spawnCreep(bodyType, name,
            {
                memory:
                {
                    ctrl: globals.NO_CONTROL,
                    actd: globals.NO_ACT_DISTANCE,
                    dest: globals.NO_DESTINATION,
                    btyp: type,
                    levl: level,
                    rstk: TypeRestock[type]
                }
            }
        ) == OK;
    }

    return false;
};

spawnController.control = function(room)
{
    this.debugPing(room);

    // TODO move creeps to spawn for renewal or absorbtion
    //var rc = this.creepsToTargets(room);
    var rc = 0;

    var level = 0;

    if (room.controller)
    {
        if (room.controller.my)
        {
            level = room.controller.level;
        }
    }

    if (level == 0)
    {
        return rc;
    }

    const spawns = room.find(FIND_MY_SPAWNS);

    if (spawns.length == 0)
    {
        return rc;
    }

    // cap off at defined
    if (level >= TypeCount.length)
    {
        level = TypeCount.length - 1;
    }

    const creeps = room.find(FIND_MY_CREEPS);

    // quick check - by # of creeps
    const creepsWanted = _.sum(TypeCount[level]);
    if (creeps.length >= creepsWanted)
    {
        return rc;
    }

    // TODO better way
    // FFS keep this syncronized with above
    var creepCount = [0, 0];

    for (var i = 0; i < creeps.length; ++i)
    {
        ++creepCount[creeps[i].memory.btyp];
    }

    // STRATEGY spawns are few, types are plenty
    for (var i = 0; i < spawns.length; ++i)
    {
        var notSpawned = true;
        for (var type = 0; type < TypeBody.length && notSpawned; ++type)
        {
            var delta = TypeCount[level][type] - creepCount[type];

            if (delta > 0)
            {
                notSpawned = !doSpawn(spawns[i], type, level);
            }
        }
    }

    return rc;
};

module.exports = spawnController;
