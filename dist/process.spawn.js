'use strict';

var globals = require('globals');
var bodywork = require('routine.bodywork');
var Process = require('process.template');

var spawnProcess = new Process('spawn');

const TypeBody        = [ bodywork[0], bodywork[1], bodywork[2] ];
const TypeHarvest     = [ true,        true,        undefined   ];
const TypeRestock     = [ undefined,   true,        undefined   ];
const TypeMiner       = [ undefined,   undefined,   true        ];
const TypeLimitSource = [ 2.0,         1.0,         undefined   ];
const TypeLimitMining = [ undefined,   undefined,   1.0         ];
const TypeCount       = [
                        [ 4,           0,           0           ], // level 0
                        [ 6,           0,           1           ], // level 1
                        [ 8,           0,           1           ], // level 2
                        [ 10,          2,           1           ], // level 3
                        [ 10,          4,           1           ], // level 4
                        [ 10,          4,           1           ], // level 5
                        [ 6,           2,           1           ]  // level 6
                                                                ];

spawnProcess.calculateCreepsNeeded = function(energyLevel, sourceLevel, miningLevel)
{
    if (!this.countCache)
    {
        this.countCache = { };
    }

    const cacheKey = (energyLevel + 1) * 1 +
                     (sourceLevel + 1) * 100 +
                     (miningLevel + 1) * 10000;
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
                creepsNeeded[i] = limitSource;
            }
        }

        let limitMining = TypeLimitMining[i];

        if (limitMining !== undefined)
        {
            limitMining = Math.ceil(limitMining * miningLevel);
            if (creepsNeeded[i] > limitMining)
            {
                creepsNeeded[i] = limitMining;
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
@param {string} owner room that will own the creep.
@return True if creep spawn started.
**/
spawnProcess.doSpawn = function(spawn, type, owner)
{
    const name = spawn.id + '_' + Game.time;

    // level and body derived from spawning room, not from owner
    const [level, body] = TypeBody[type](spawn.room.memory.elvl);

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
                    crum: owner,
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

spawnProcess.work = function(room)
{
    this.debugHeader(room);

    const creeps = room.getRoomControlledCreeps();
    this.workImpl(room, room, creeps);
};

spawnProcess.workImpl = function(ownerRoom, spawnRoom, creeps)
{
    // if cannot spawn anything ...
    if (spawnRoom.memory.elvl == 0)
    {
        // ... ask for help
        if (spawnRoom.memory.sstr)
        {
            let sisterRoom = Game.rooms[spawnRoom.memory.sstr];
            if (sisterRoom)
            {
                this.workImpl(ownerRoom, sisterRoom, creeps);
            }
        }

        return;
    }

    let creepsNeeded = this.calculateCreepsNeeded(
        ownerRoom.memory.elvl,
        ownerRoom.memory.slvl,
        ownerRoom.memory.mlvl
    );

    for (let i = 0; i < creeps.length; ++i)
    {
        --creepsNeeded[creeps[i].memory.btyp];
    }

    let allBalanced = true;

    for (let i = 0; i < creepsNeeded.length && allBalanced; ++i)
    {
        if (creepsNeeded[i] > 0)
        {
            allBalanced = false;
        }
    }

    if (allBalanced)
    {
        this.debugLine(ownerRoom, 'No need to spawn');
        return;
    }

    // check for spawns
    const spawns = spawnRoom.find(FIND_MY_SPAWNS,
        {
            filter: function(spawn)
            {
                return !spawn.spawning && spawn.isActiveSimple();
            }
        }
    );

    if (spawns.length == 0)
    {
        this.debugLine(ownerRoom, 'No free spawns found');
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
                spawned = this.doSpawn(spawns[i], type, ownerRoom.name);

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
        if (ownerRoom.id == spawnRoom.id)
        {
            this.debugLine(ownerRoom, 'Spawned creeps ' + totalSpawned);
        }
        else
        {
            this.debugLine(ownerRoom, 'Remotely spawned creeps ' + totalSpawned + ' at ' + spawnRoom.name);
            this.debugLine(spawnRoom, 'Assisted spawned creeps ' + totalSpawned + ' for ' + ownerRoom.name);
        }
    }
};

spawnProcess.register();

module.exports = spawnProcess;
