'use strict';

var globals = require('globals');
var Process = require('process.template');

var spawnProcess = new Process('spawn');

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

var _workUniversalCache_ = { };

/**
Body calculator.
Universal worker that could do any Work and restock supplies.
@param {integer} level.
@return Creep body definition.
**/
const workUniversal = function(level)
{
    if (level == 0)
    {
        return [];
    }

    const cacheHit = _workUniversalCache_[level];

    if (cacheHit)
    {
        return cacheHit;
    }

    // total 250 per iteration
    const front = [WORK,  MOVE]; // 150 = 100 50
    const back =  [CARRY, MOVE]; // 100 = 50 50

    var total = level;

    // above three increment in 500
    if (total > 3)
    {
        total = 3 + ((total - 3) * 2);
    }

    var result = [];
    for (var i = 0; i < total && i < 12; ++i)
    {
        result = front.concat(result).concat(back);
    }

    _workUniversalCache_[level] = result;

    return result;
};

var _workHeavyCache_ = { };

/**
Body calculator.
Heavy worker that is best when stationary at some area and work.
@param {integer} level.
@return Creep body definition.
**/
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

    // for level 3 stay within 800 energy
    if (level == 3)
    {
        // 800  100   100   100   100   100   50     50     50     50    50    50
        return [WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE];
    }

    const cacheHit = _workHeavyCache_[level];

    if (cacheHit)
    {
        return cacheHit;
    }

    // for level 4 and above 300 energy per level
    const front = [WORK, WORK, CARRY]; // 250 = 100 100 50
    const back =  [MOVE]; // 50 = 50

    var result = [];
    for (var i = 1; i < level && i < 12; ++i)
    {
        result = front.concat(result).concat(back);
    }

    // stuff -> work -> carry -> move
    const bpMap = function(bp)
    {
        if (bp == WORK)
            return 1;

        if (bp == CARRY)
            return 2;

        if (bp == MOVE)
            return 3;

        return 0;
    };

    result.sort(
        function(bp1, bp2)
        {
            if (bp1 == bp2)
                return 0;

            return bpMap(bp1) - bpMap(bp2);
        }
    );

    _workHeavyCache_[level] = result;

    return result;
};

const TypeBody    = [ workUniversal, workHeavy ];
const TypeHarvest = [ true,          true      ];
const TypeRestock = [ true,          false     ];
const TypeCount   = [
                    [ 0,             0         ], // level 0, no own controller
                    [ 6,             2         ], // level 1
                    [ 8,             3         ], // level 2
                    [ 10,            4         ]  // level 3, crowd enough
                                               ];

/**
Spawn implementation.
@param {Spawn} spawn.
@param {integer} type.
@param {integer} level.
@return True if creep spawn initiated.
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
                    // 'undefined' is not using memory
                    crum: spawn.room.name,
                    ctrl: globals.NO_CONTROL,
                    dest: globals.NO_DESTINATION,
                    dact: globals.NO_ACT_RANGE,
                    xtra: globals.NO_EXTRA,
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

spawnProcess.work = function(room, creeps)
{
    this.debugHeader(room);

    const elvl = room.memory.elvl;

    if (elvl == 0)
    {
        return;
    }

    // cap off at defined
    var mobLevel = elvl;
    if (mobLevel >= TypeCount.length)
    {
        mobLevel = TypeCount.length - 1;
    }

    // STRATEGY creeps will rotate "soon enough" on global scale, save CPU
    // quick check - by # of creeps
    if (creeps.length >= _.sum(TypeCount[mobLevel]))
    {
        this.debugLine(room, 'Creep # is enough, no detail check');
        return;
    }

    const spawns = room.find(FIND_MY_SPAWNS,
        {
            filter: function(spawn)
            {
                return !spawn.spawning && spawn.isActive();
            }
        }
    );

    if (spawns.length == 0)
    {
        this.debugLine(room, 'No free spawns found');
        return;
    }

    // copy array
    var creepsNeeded = TypeCount[mobLevel].slice(0);

    for (var i = 0; i < creeps.length; ++i)
    {
        --creepsNeeded[creeps[i].memory.btyp];
    }

    var totalSpawned = 0;

    // STRATEGY there are less spawns than creep types
    for (var i = 0; i < spawns.length; ++i)
    {
        var spawned = false;

        for (var type = 0; type < TypeBody.length && !spawned; ++type)
        {
            if (creepsNeeded[type] > 0)
            {
                spawned = doSpawn(spawns[i], type, elvl);
            }
        }

        if (spawned)
        {
            ++totalSpawned;
        }
    }

    if (totalSpawned > 0)
    {
        this.debugLine(room, 'Spawned creeps ' + totalSpawned);
    }
};

module.exports = spawnProcess;
