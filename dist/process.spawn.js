'use strict';

var globals = require('globals');
var bodywork = require('routine.bodywork');
var Process = require('process.template');

var spawnProcess = new Process('spawn');

const TypeBody        = [ bodywork[0], bodywork[1], bodywork[2] ];
const TypeHarvest     = [ true,        true,        undefined   ];
const TypeRestock     = [ undefined,   true,        undefined   ];
const TypeMiner       = [ undefined,   undefined,   true        ];
const TypeLimitSource = [ 5.0,         2.0,         undefined   ];
const TypeLimitMining = [ undefined,   undefined,   1.0         ];
const TypeCount       = [
                        [ 0,           0,           0           ], // level 0, no own controller
                        [ 6,           0,           1           ], // level 1
                        [ 8,           0,           1           ], // level 2
                        [ 10,          2,           1           ], // level 3
                        [ 10,          4,           1           ]  // level 4
                                                                ];

spawnProcess.calculateCreepsNeeded = function(energyLevel, sourceLevel, miningLevel)
{
    if (!this.countCache)
    {
        this.countCache = { };
    }

    const cacheKey = (energyLevel + 1) * 1 +
                     (sourceLevel + 1) * 100 +
                     (miningLevel + 1) * 1000;
    const cacheHit = this.countCache[cacheKey];
    if (cacheHit)
    {
        return cacheHit.slice(0);
    }

    // cap off at defined
    let mobLevel = energyLevel;
    if (mobLevel >= TypeCount.length)
    {
        mobLevel = TypeCount.length - 1;
    }

    // copy array
    let creepsNeeded = TypeCount[mobLevel].slice(0);

    // limits
    for (let i = 0; i < creepsNeeded.length; ++i)
    {
        let limitSource = TypeLimitSource[i];

        if (limitSource !== undefined)
        {
            limitSource = Math.ceil(limitSource * sourceLevel);
            if (creepsNeeded[i] > limitSource)
            {
                creepsNeede[i] = limitSource
            }
        }

        let limitMining = TypeLimitMining[i];

        if (limitMining !== undefined)
        {
            limitMining = Math.ceil(limitMining * miningLevel);
            if (creepsNeeded[i] > limitMining)
            {
                creepsNeede[i] = limitMining
            }
        }
    }

    // cache
    this.countCache[cacheKey] = creepsNeeded;

    return creepsNeeded.slice(0);
};

/**
Spawn implementation.
@param {Spawn} spawn.
@param {integer} type.
@param {integer} energyLevel.
@return True if creep spawn started.
**/
spawnProcess.doSpawn = function(spawn, type)
{
    const name = spawn.id + '_' + Game.time;

    const [level, body] = TypeBody[type](spawn.room.elvl);

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
                    rstk: TypeRestock[type],
                    minr: TypeMiner[type]
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

    let creepsNeeded = this.calculateCreepsNeeded(room.memory.elvl, room.memory.slvl, room.memory.mlvl);

    let hasBelow = false;

    for (let i = 0; i < creeps.length; ++i)
    {
        let btype = creeps[i].memory.btyp;

        let count = creepsNeeded[btype];
        --count;
        creepsNeeded[btype] = count;

        if (count < 0)
        {
            hasBelow = true;
        }
    }

    if (hasBelow)
    {
        // remember for TTL
        room.memory.ccnt = creepsNeeded;
    }
    else
    {
        room.memory.ccnt = undefined;
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

    let totalSpawned = 0;

    // STRATEGY there are less spawns than creep types
    for (let i = 0; i < spawns.length; ++i)
    {
        let spawned = false;

        for (let type = 0; type < TypeBody.length && !spawned; ++type)
        {
            if (creepsNeeded[type] > 0)
            {
                spawned = this.doSpawn(spawns[i], type);

                if (spawned)
                {
                    --creepsNeeded[type];
                }
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
