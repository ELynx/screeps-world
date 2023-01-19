'use strict';

var Process = require('process.template');

var roomInfoProcess = new Process('roomInfo');

// STRATEGY this does not account for sources being close enough to share walkables

/**
Calculate room energy level.
@param {Room} room.
@return Energy level of room.
**/
roomInfoProcess.energyLevel = function(room)
{
    let level = 0;
    if (room && room.controller)
    {
        level = room.controller.level;
    }
    else
    {
        return 0;
    }

    const structs = room.find(
        FIND_STRUCTURES,
        {
            filter: function(structure)
            {
                return (structure.structureType == STRUCTURE_SPAWN ||
                        structure.structureType == STRUCTURE_EXTENSION) &&
                        structure.my;
            }
        }
    );

    let spawnCount = 0;
    let extensionCount = 0;

    for (let i = 0; i < structs.length; ++i)
    {
        const struct = structs[i];

        if (struct.structureType == STRUCTURE_SPAWN)
        {
            ++spawnCount;
        }
        else if (struct.structureType == STRUCTURE_EXTENSION)
        {
            ++extensionCount;
        }
    }

    spawnCount     = Math.min(spawnCount,     CONTROLLER_STRUCTURES[STRUCTURE_SPAWN][level]);
    extensionCount = Math.min(extensionCount, CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][level]);

    // room cold start
    if (spawnCount == 0)
    {
        return 0;
    }

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

    // has spawn, has no creeps, means creeps wiped or room start
    if (energyGivingCreeps.length == 0)
    {
        // there is no one to refill spawns, etc
        // there is only a dribble of energy up to 300
        // still can try to spawn weaklings
        return 1;
    }

    let energyCapacity = EXTENSION_ENERGY_CAPACITY[level] * extensionCount;
    energyCapacity    += SPAWN_ENERGY_CAPACITY * spawnCount;

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

roomInfoProcess._walkable = function(terrain, position)
{
    if (terrain.get(position.x, position.y) != TERRAIN_MASK_WALL)
    {
        return true;
    }

    const atPosition = position.lookFor(LOOK_STRUCTURES);
    for (let k in atPosition)
    {
        const struct = atPosition[k];
        if (struct.structureType == STRUCTURE_ROAD)
        {
            return true;
        }
    }

    return false;
};

roomInfoProcess._walkableAround = function(terrain, posOrRoomObject)
{
    const center = posOrRoomObject.pos ? posOrRoomObject.pos : posOrRoomObject;

    let walkable = 0;
    for (let dx = -1; dx <= 1; ++dx)
    {
        for (let dy = -1; dy <= 1; ++dy)
        {
            if (dx == 0 && dy == 0)
                continue;

            const x = center.x + dx;
            const y = center.y + dy;

            if (x < 0 || x > 49 || y < 0 || y > 49)
                continue;

            if (this._walkable(terrain, new RoomPosition(x, y, center.roomName)))
            {
                ++walkable;
            }
        }
    }

    return walkable;
};

roomInfoProcess.harvestLevel = function(room)
{
    const terrain = room.getTerrain();
    const sources = room.find(FIND_SOURCES);

    let totalWalkable = 0;
    for (let i = 0; i < sources.length; ++i)
    {
        const source = sources[i];
        const walkable = this._walkableAround(terrain, source);

        totalWalkable += walkable;
    }

    return totalWalkable;
};

/**
Calculate room source level.
@param {Room} room.
@return Source level of room.
**/
roomInfoProcess.sourceLevel = function(room)
{
    const links = room.find(
        FIND_STRUCTURES,
        {
            filter: { structureType: STRUCTURE_LINK }
        }
    );

    // don't bother, there is no transfer happening
    if (links.length < 2) return 0;

    let hasDestination = false;
    for (let i = 0; i < links.length; ++i)
    {
        const link = links[i];

        if (link.my && link.isActiveSimple() && !link.isSource())
        {
            hasDestination = true;
            break;
        }
    }

    // no need to optimize energy transfer when there is no destination
    if (!hasDestination) return 0;

    const terrain = room.getTerrain();
    const sources = room.find(FIND_SOURCES);

    let soucePositions = 0;

    for (let i = 0; i < links.length; ++i)
    {
        const link = links[i];

        if (link.my && link.isActiveSimple())
        {
            if (link.isSource())
            {
                let positions = { };
                for (let j = 0; j < sources.length; ++j)
                {
                    const source = sources[j];
                    const betweenTwo = link.pos.findSharedAdjacentPositions(source.pos);

                    for (let k = 0; k < betweenTwo.length; ++k)
                    {
                        const p = betweenTwo[k];
                        positions[(p.x + 1) + 100 * (p.y + 1)] = p;
                    }
                }

                for (let outerIndex in positions)
                {
                    const position = positions[outerIndex];
                    if (this._walkable(terrain, position))
                    {
                        ++soucePositions;
                    }
                }
            }
        }
    }

    return soucePositions;
};

/**
Calculate room mining level.
@param {Room} room.
@return Mining level of room.
**/
roomInfoProcess.miningLevel = function(room)
{
    // quick test
    if (room.terminal === undefined && room.storage === undefined)
        return 0;

    const extractors = room.find(
        FIND_STRUCTURES,
        {
            filter: function(structure)
            {
                return structure.my && structure.structureType == STRUCTURE_EXTRACTOR && structure.isActiveSimple();
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
                return structure.structureType == STRUCTURE_WALL && structure.hits;
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

// STRATEGY wall build-up
roomInfoProcess._walls = function(room)
{
    // walls can be inherited and force room into over-repair
    // control the wlvl to not increment in great steps

    const roomPlanned = room.memory.wlvl;
    if (roomPlanned)
    {
        const roomHas = this.wallLevel(room);

        // if walls are under-level, build up from what is available
        if (roomHas < roomPlanned) return roomHas + 1;

        // walls are equal or greater
        // may be significantly greater

        if (room.memory.threat === undefined)
        {
            if (Math.random() < 1/6)
            {
                return roomPlanned + 1;
            }
        }

        // no growth
        return roomPlanned;
    }
    else
    {
        // no previous value
        // start with recommended value

        // TODO integrate with repair controller
        const TargetBarrierHp = [
            0,
            5,
            10,
            15,
            20,
            25
        ];

        let elvl = room.memory.elvl;
        if (elvl >= TargetBarrierHp.length) elvl = TargetBarrierHp.length - 1;

        return TargetBarrierHp[elvl];
    }
};

roomInfoProcess.work = function(room)
{
    this.debugHeader(room);

    // once in a creep life update room info
    if (room.memory.intl === undefined ||
        room.memory.intl < Game.time - CREEP_LIFE_TIME)
    {
        room.memory.elvl = this.energyLevel(room);
        room.memory.hlvl = this.harvestLevel(room);
        room.memory.slvl = this.sourceLevel(room);
        room.memory.mlvl = this.miningLevel(room);
        room.memory.wlvl = this._walls(room);

        room.memory.trme = 300;
        room.memory.stre = 10000;

        // offset regeneration time randomly so multiple rooms don't do it at same tick
        room.memory.intl = Game.time + Math.ceil(Math.random() * 42);
    }
};

roomInfoProcess.register();

module.exports = roomInfoProcess;
