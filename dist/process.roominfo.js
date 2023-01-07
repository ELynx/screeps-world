'use strict';

var makeCaveMap = require('routine.map');
var Process = require('process.template');

var roomInfoProcess = new Process('roomInfo');

/**
Calculate room energy level.
@param {Room} room.
@return Energy level of room.
**/
roomInfoProcess.energyLevel = function(room)
{
    const structs = room.find(
        FIND_STRUCTURES,
        {
            filter: function(structure)
            {
                return (structure.structureType == STRUCTURE_SPAWN ||
                        structure.structureType == STRUCTURE_EXTENSION) &&
                        structure.isActive() &&
                        structure.my;
            }
        }
    );

    let energyCapacity = 0;
    let hasSpawn = false;

    for (let i = 0; i < structs.length; ++i)
    {
        energyCapacity = energyCapacity + structs[i].energyCapacity;
        hasSpawn = hasSpawn || structs[i].structureType == STRUCTURE_SPAWN;
    }

    // room cold start
    if (!hasSpawn)
    {
        return 0;
    }

    // has spawn, has no creeps, means creeps wiped or room start
    const roomCreeps = room.getRoomControlledCreeps();
    const energyGivingCreeps = _.filter(
        roomCreeps,
        function(creep)
        {
            if (creep.memory.rstk) return false;
            if (creep.memory.minr) return false;

            return true;
        }
    );

    if (energyGivingCreeps.length == 0)
    {
        // there is no one to refill spawns, etc
        // there is only a dribble of energy up to 300
        // still can try to spawn weaklings
        return 1;
    }

    if (energyCapacity >= 800)
    {
        // above 800 (aka full built RCL 3) go in increments of 500
        return Math.floor((energyCapacity - 799) / 500) + 3;
    }

    if (energyCapacity >= 550)
    {
        return 2;
    }

    if (energyCapacity >= 300)
    {
        return 1;
    }

    return 0;
};

/**
Calculate room source level.
@param {Room} room.
@return Source level of room.
**/
roomInfoProcess.sourceLevel = function(room)
{
    let walkable = 0;

    const sources = room.find(FIND_SOURCES);
    for (let i = 0; i < sources.length; ++i)
    {
        walkable = walkable + sources[i].pos.walkableTiles();
    }

    return walkable;
};

/**
Calculate room mining level.
@param {Room} room.
@return Mining level of room.
**/
roomInfoProcess.miningLevel = function(room)
{
    // quick test
    if (room.terminal === undefined) return 0;

    const extractors = room.find(
        FIND_STRUCTURES,
        {
            filter: function(structure)
            {
                return structure.my && structure.structureType == STRUCTURE_EXTRACTOR && structure.isActive();
            }
        }
    );
    if (extractors.length == 0) return 0;

    const minerals = room.find(
        FIND_MINERALS,
        {
            filter: function(mineral)
            {
                return mineral.mineralAmount > 0;
            }
        }
    );
    if (minerals.length == 0) return 0;

    return 1;
};

roomInfoProcess.wallLevel = function(room)
{
    const walls = room.find(
        FIND_STRUCTURES,
        {
            filter: function(structure)
            {
                return structure.structureType == STRUCTURE_WALL;
            }
        }
    );

    if (walls.length == 0)
    {
        return 0;
    }

    // fill in array of wall hits
    let hits = [];
    for (let i = 0; i < walls.length; ++i)
    {
        hits.push(Math.floor(walls[i].hits / 1000));
    }

    hits.sort(
        function(hits1, hits2)
        {
            return hits1 - hits2;
        }
    );

    return hits[Math.floor(hits.length / 2)];
};

roomInfoProcess.work = function(room)
{
    this.debugHeader(room);

    // once in a creep life update room info
    if (room.memory.intl === undefined ||
        room.memory.intl < Game.time - 1500)
    {
        room.memory.elvl = this.energyLevel(room);
        room.memory.slvl = this.sourceLevel(room);
        room.memory.mlvl = this.miningLevel(room);
        room.memory.wlvl = this.wallLevel(room);

        // STRATEGY from level 6 room builds up walls
        if (room.memory.elvl > 5 &&
            room.memory.threat === undefined)
        {
            if (Math.random() < 0.5)
            {
                ++room.memory.wlvl;
            }
        }

        makeCaveMap(room);

        // TODO get rid of hardcode
        const flagName = 'strelok_' + room.name;
        const flag = Game.flags[flagName];
        if (flag)
        {
            const patrolUnits = Math.min(3, room.memory.elvl + 1);
            flag.setValue(patrolUnits);
        }
        else
        {
            // TODO at the "downtown"
            const flagPos = new RoomPosition(25, 25, room.name);
            // TODO setValue(1)
            // new room info, start with single guard
            flagPos.createFlag(flagName, COLOR_GREEN);
        }

        // offset regeneration time randomly so multiple rooms don't do it at same tick
        room.memory.intl = Game.time + Math.ceil(Math.random() * 42);
    }
};

roomInfoProcess.register();

module.exports = roomInfoProcess;
