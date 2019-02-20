var globals = require('globals');
var Controller = require('controller.template');

var spawnController = new Controller('spawn');

/**
MEMO - body part cost

MOVE            50
WORK            100
ATTACK          80
CARRY           50
HEAL            250
RANGED_ATTACK   150
TOUGH           10
CLAIM           600
**/

const workUniversal = function(level)
{
    if (level == 0)
    {
        return [];
    }

    // total 250 per level
    const front = [WORK,  MOVE]; // 150 = 100 50
    const back =  [CARRY, MOVE]; // 100 = 50 50

    var result = [];
    for (var i = 0; i < level; ++i)
    {
        result = front.concat(result).concat(back);
    }

    return result;
};

const workHeavy = function(level)
{
    if (level == 0)
    {
        return [];
    }

    // for level 1 stay within 300 energy
    if (level == 1)
    {
        // 300  100   100   50     50
        return [WORK, WORK, CARRY, MOVE];
    }

    // for level 2 stay within 550 energy
    if (level == 2)
    {
        // 550  100   100   100   50     50     50     50    50
        return [WORK, WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE];
    }

    // for level 3 and above 400 energy per level above 1
    const front = [WORK, WORK, CARRY, CARRY, CARRY]; // 350 = 100 100 50 50 50
    const back =  [MOVE]; // 50 = 50

    var result = [];
    for (var i = 1; i < level; ++i)
    {
        result = front.concat(result).concat(back);
    }

    return result;
};

const TypeBody    = [ workUniversal, workHeavy ];
const TypeHarvest = [ true,            true    ];
const TypeRestock = [ true,            false   ];
const TypeCount   = [
                    [ 0,               0       ], // level 0, no own controller
                    [ 6,               2       ], // level 1
                    [ 9,               3       ], // level 2
                    [ 12,              4       ]  // level 3
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
                    hvst: TypeHarvest[type],
                    rstk: TypeRestock[type]
                }
            }
        ) == OK;
    }

    return false;
};

spawnController.act = function(spawn, creep)
{
    return spawn.recycleCreep(creep) == OK;
};

spawnController.findCreeps = function(creeps)
{
    var result = [];

    for (var i = 0; i < creeps.length; ++i)
    {
        if (creeps[i].ticksToLive <= 100)
        {
            result.push(creeps[i]);
        }
    }

    return result;
};

spawnController.control = function(room, creeps)
{
    this.debugHeader(room);

    var level = globals.loopCache[room.id].level;

    if (level == 0)
    {
        return;
    }

    const spawns = room.find(FIND_MY_SPAWNS,
        {
            filter: function(spawn)
            {
                return spawn.isActive();
            }
        }
    );

    if (spawns.length == 0)
    {
        this.debugLine(room, 'No controllable spawns found');
        return;
    }

    // call default implementation for mortuary service
    {
        const targetCreeps = this.findCreeps(creeps);
        this.creepsToTargets(room, spawns, targetCreeps);
    }

    // cap off at defined
    if (level >= TypeCount.length)
    {
        level = TypeCount.length - 1;
    }

    // STRATEGY creeps will rotate "soon enough" on global scale, save CPU
    // quick check - by # of creeps
    const creepsWanted = _.sum(TypeCount[level]);
    if (creeps.length >= creepsWanted)
    {
        return;
    }

    var creepsNeeded = [];
    for (var i = 0; i < TypeBody.length; ++i)
    {
        creepsNeeded = creepsNeeded.concat(TypeCount[level][i]);
    }

    for (var i = 0; i < creeps.length; ++i)
    {
        --creepsNeeded[creeps[i].memory.btyp];
    }

    var totalSpawned = 0;

    // STRATEGY there are less spawns than creep types
    for (var i = 0; i < spawns.length; ++i)
    {
        if (spawns[i].spawning)
        {
            continue;
        }

        var spawned = false;

        for (var type = 0; type < TypeBody.length && !spawned; ++type)
        {
            if (creepsNeeded[type] > 0)
            {
                spawned = doSpawn(spawns[i], type, level);
            }
        }

        if (spawned)
        {
            ++totalSpawned;
        }
    }

    this.debugLine(room, 'Total spawned ' + totalSpawned);

    return;
};

module.exports = spawnController;
