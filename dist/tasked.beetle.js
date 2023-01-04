'use strict';

var Tasked = require('tasked.template');

var beetle = new Tasked('beetle');

const BreachCompleteRange = 1;

beetle.creepAtDestination = function(creep)
{
    creep.withdrawFromAdjacentEnemyStructures();

    // stop calculations on arrival
    const controlPos = creep.getControlPos();
    if (creep.pos.getRangeTo(controlPos) <= BreachCompleteRange)
    {
        creep.memory._breach_ = undefined;
        creep.memory._breachT_ = undefined;

        this._coastToHalt(creep);

        return;
    }

    // every N ticks refresh situation
    if (creep.memory._breachT_)
    {
        if (Game.time - creep.memory._breachT_ > 10)
        {
            creep.memory._breach_ = undefined;
            creep.memory._breachT_ = undefined;
        }
    }

    // no path known
    if (creep.memory._breach_ === undefined)
    {
        const path = creep.room.findPath
        (
            creep.pos,
            controlPos,
            {
                ignoreCreeps: true,
                ignoreDestructibleStructures: true,
                ignoreRoads:true,
                maxRooms: 1,
                range: BreachCompleteRange,
                serialize: true
            }
        );

        creep.memory._breach_ = path;
        creep.memory._breachT_ = Game.time;
    }

    const path = Room.deserializePath(creep.memory._breach_);
    creep.room.visual.poly(path);

    let next = undefined;
    for (let i = 0; i < path.length - BreachCompleteRange; ++i)
    {
        const pathPoint = path[i];
        if (creep.pos.x == pathPoint.x && creep.pos.y == pathPoint.y)
        {
            next = path[i + 1];
            break;
        }
    }

    // do a 1st step
    if (next === undefined && path.length > 0)
    {
        next = path[0];
    }

    if (next)
    {
        let target = undefined;

        const atNext = creep.room.lookForAt(LOOK_STRUCTURES, next.x, next.y);
        for (const struct in atNext)
        {
            // walkable
            if (struct.structureType == STRUCTURE_CONTAINER ||
                struct.structureType == STRUCTURE_ROAD)
            {
                continue;
            }

            if (struct.structureType == STRUCTURE_RAMPART)
            {
                target = struct;
                break;
            }

            target = struct;
        }

        let rc = ERR_INVALID_TARGET;
        if (target)
        {
            rc = creep.dismantle(target);
        }

        if (rc != OK)
        {
            creep.move(next.direction);
        }
    }
    else
    {
        creep.memory._breach_ = undefined;
        creep.memory._breachT_ = undefined;
    }
};

beetle.flagPrepare = function(flag)
{
    const breechers = flag.pos.findInRange(FIND_MY_CREEPS, BreachCompleteRange);
    return breechers.length == 0 ? this.FLAG_SPAWN : this.FLAG_REMOVE;
};

beetle.makeBody = function(spawn)
{
    const elvl = spawn.room.memory.elvl;

    if (elvl < 1)
    {
        return [ MOVE, WORK ];
    }
    else if (elvl <= 3)
    {
        return [ MOVE, MOVE, WORK, WORK ];
    }
    else
    {
        return [ MOVE, MOVE, MOVE, MOVE, MOVE, WORK, WORK, WORK, WORK, WORK ];
    }
};

beetle.register();

module.exports = beetle;
