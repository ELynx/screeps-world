'use strict';

var globals = require('globals');
var bodywork = require('routine.bodywork');
var Process = require('process.template');

var spawnProcess = new Process('spawn');

spawnProcess.calculateCreepsNeeded = function(energyLevel, harvestLevel, sourceLevel, miningLevel)
{
    // TODO (high priority) creep need logic
    return [Math.ceil(energyLevel * 1.5), sourceLevel > 0 ? 2 : 0, miningLevel];
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
        ownerRoom.memory.hlvl,
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
    const spawns = spawnRoom.find(
        FIND_STRUCTURES,
        {
            filter: function(structure)
            {
                if (structure.my && structure.structureType == STRUCTURE_SPAWN)
                {
                    return !structure.spawning && structure.isActiveSimple();
                }

                return false;
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
