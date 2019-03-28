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

/**
Body calculator.
Universal worker.
Could do any work.
Restocks energy while there are no specialists.
@param {integer} level.
@return Creep body definition.
**/
spawnProcess.workUniversal = function(level)
{
    if (level == 0)
    {
        return [];
    }

    if (!this.workUniversalCache)
    {
        this.workUniversalCache = { };
    }

    const cacheHit = this.workUniversalCache[level];

    if (cacheHit)
    {
        return cacheHit.slice(0);
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

    this.workUniversalCache[level] = result;

    return result;
};

/**
Body calculator.
Restocker, harvest and slowly brings energy.
@param {integer} level.
@return Creep body definition.
**/
spawnProcess.restocker = function(level)
{
    if (level < 3)
    {
        return [];
    }

    // for level 3 stay within 800 energy
    if (level == 3)
    {
        // 800  100   100   100   100   100   50     50     50     50    50    50
        return [WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE];
    }

    if (!this.restockerCache)
    {
        this.restockerCache = { };
    }

    const cacheHit = this.restockerCache[level];

    if (cacheHit)
    {
        return cacheHit.slice(0);
    }

    // for level 4 and above add 100 energy per level
    const more =  [CARRY, MOVE]; // 100 = 50 + 50

    var result = this.restocker(3);
    for (var i = 1; i < level && i < 19; ++i)
    {
        result = result.concat(more);
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

    this.restockerCache[level] = result;

    return result;
};

spawnProcess.calculateCreepsNeeded = function(energyLevel, sourceLevel)
{
    if (!this.countCache)
    {
        this.countCache = { };
    }

    const cacheLevel0 = this.countCache[energyLevel];

    if (cacheLevel0)
    {
        const cacheHit = cacheLevel0[sourceLevel];

        if (cacheHit)
        {
            return cacheHit.slice(0);
        }
    }

    // cap off at defined
    var mobLevel = energyLevel;
    if (mobLevel >= TypeCount.length)
    {
        mobLevel = TypeCount.length - 1;
    }

    // copy array
    var creepsNeeded = TypeCount[mobLevel].slice(0);

    // limit by source level
    for (var i = 0; i < creepsNeeded.length; ++i)
    {
        var limit = TypeLimit[i];

        if (!limit)
        {
            continue;
        }

        limit = Math.round(limit * sourceLevel);

        if (creepsNeeded[i] > limit)
        {
            creepsNeeded[i] = limit;
        }
    }

    // cache
    if (!this.countCache[energyLevel])
    {
        this.countCache[energyLevel] = { };
    }

    this.countCache[energyLevel][sourceLevel] = creepsNeeded;

    return creepsNeeded.slice(0);
};

/**
Spawn implementation.
@param {Spawn} spawn.
@param {integer} type.
@param {integer} level.
@return True if creep spawn initiated.
**/
spawnProcess.doSpawn = function(spawn, type, roomLevel)
{
    const name = spawn.id + '_' + Game.time;
    const strength = globals.roomEnergyToStrength(roomLevel);
    const body = TypeBody[type](strength);

    if (body.length == 0 || body.length > 50)
    {
        return false;
    }

    if (spawn.spawnCreep(body, name, { dryRun: true }) == OK)
    {
        return spawn.spawnCreep(body, name,
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
                    levl: strength,
                    hvst: TypeHarvest[type],
                    rstk: TypeRestock[type]
                }
            }
        ) == OK;
    }

    return false;
};

const TypeBody    = [ spawnProcess.workUniversal,
                                   spawnProcess.restocker ];
const TypeHarvest = [ true,        true                   ];
const TypeRestock = [ false,       true                   ];
const TypeLimit   = [ 5.0,         1.0                    ]; // limit by source level
const TypeCount   = [
                    [ 0,           0                      ], // level 0, no own controller
                    [ 4,           0                      ], // level 1
                    [ 8,           0                      ], // level 2
                    [ 10,          4                      ]  // level 3, crowd enough
                                                          ];

spawnProcess.work = function(room, creeps)
{
    this.debugHeader(room);

    const roomLevel = room.memory.elvl;

    if (roomLevel == 0)
    {
        return;
    }

    var creepsNeeded = this.calculateCreepsNeeded(roomLevel, room.memory.slvl);

    for (var i = 0; i < creeps.length; ++i)
    {
        --creepsNeeded[creeps[i].memory.btyp];
    }

    // remember for TTL
    room.memory.ccnt = creepsNeeded;

    var hasNeeded = false;

    // check
    for (var i = 0; i < creepsNeeded.length && !hasNeeded; ++i)
    {
        hasNeeded = creepsNeeded[i] > 0;
    }

    if (!hasNeeded)
    {
        return;
    }

    // check for spawns
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

    var totalSpawned = 0;

    // STRATEGY there are less spawns than creep types
    for (var i = 0; i < spawns.length; ++i)
    {
        var spawned = false;

        for (var type = 0; type < TypeBody.length && !spawned; ++type)
        {
            if (creepsNeeded[type] > 0)
            {
                spawned = this.doSpawn(spawns[i], type, roomLevel);
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

spawnProcess.register();

module.exports = spawnProcess;
