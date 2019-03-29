'use strict';

var globals = require('globals');
var bodywork = require('routine.bodywork');
var Process = require('process.template');

var spawnProcess = new Process('spawn');

const TypeBody    = [ bodywork[0], bodywork[1] ];
const TypeHarvest = [ true,        true        ];
const TypeRestock = [ false,       true        ];
const TypeLimit   = [ 5.0,         2.0         ]; // limit by source level
const TypeCount   = [
                    [ 0,           0           ], // level 0, no own controller
                    [ 6,           0           ], // level 1
                    [ 8,           0           ], // level 2
                    [ 10,          2           ], // level 3
                    [ 10,          4           ]  // level 4
                                               ];

spawnProcess.calculateCreepsNeeded = function(energyLevel, sourceLevel)
{
    if (!this.countCache)
    {
        this.countCache = { };
    }

    const cacheOuter = this.countCache[energyLevel];

    if (cacheOuter)
    {
        const cacheHit = cacheOuter[sourceLevel];

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

        limit = Math.ceil(limit * sourceLevel);

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
@param {integer} energyLevel.
@return True if creep spawn started.
**/
spawnProcess.doSpawn = function(spawn, type, energyLevel)
{
    const name = spawn.id + '_' + Game.time;

    const [level, body] = TypeBody[type](energyLevel);

    if (level == 0 || body.length == 0 || body.length > 50)
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
                    levl: level,
                    hvst: TypeHarvest[type],
                    rstk: TypeRestock[type]
                },

                directions:
                [
                    TOP, TOP_RIGHT, RIGHT, BOTTOM_RIGHT,
                    BOTTOM, BOTTOM_LEFT, LEFT, TOP_LEFT
                ]
            }
        ) == OK;
    }

    return false;
};

spawnProcess.work = function(room, creeps)
{
    this.debugHeader(room);

    if (room.memory.elvl == 0)
    {
        return;
    }

    var creepsNeeded = this.calculateCreepsNeeded(room.memory.elvl, room.memory.slvl);

    for (var i = 0; i < creeps.length; ++i)
    {
        --creepsNeeded[creeps[i].memory.btyp];
    }

    // remember for TTL
    room.memory.ccnt = creepsNeeded;

    var hasBelow = false;

    // check
    for (var i = 0; i < creepsNeeded.length && !hasBelow; ++i)
    {
        hasBelow = creepsNeeded[i] > 0;
    }

    if (!hasBelow)
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
                spawned = this.doSpawn(spawns[i], type, room.memory.elvl);
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
