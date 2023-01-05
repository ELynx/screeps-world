'use strict';

var Tasked = require('tasked.template');

var beetle = new Tasked('beetle');

const BreachCompleteRange = 1;
const BreachEasyRange = 3;

beetle.creepAtDestination = function(creep)
{
    // every N ticks refresh situation
    if (creep.memory._breachT_)
    {
        if (Game.time - creep.memory._breachT_ > 10)
        {
            creep.memory._breach_  = undefined;
            creep.memory._breachI_ = undefined;
            creep.memory._breachT_ = undefined;
        }
    }

    // at the end of path refresh situation
    if (creep.memory._breach_ && creep.memory._breachI_)
    {
        if (creep.memory._breach_.length <= creep.memory._breachI_)
        {
            creep.memory._breach_  = undefined;
            creep.memory._breachI_ = undefined;
            creep.memory._breachT_ = undefined;
        }
    }

    const controlPos = creep.getControlPos();

    if (creep.pos.inRangeTo(controlPos, BreachCompleteRange))
    {
        creep.memory._breach_  = undefined;
        creep.memory._breachI_ = undefined;
        creep.memory._breachT_ = undefined;

        return;
    }

    // no path known
    if (creep.memory._breach_ === undefined)
    {
        const toControlPos = controlPos.getRangeTo(creep.pos);
        const easyDistance = toControlPos <= BreachEasyRange ? BreachCompleteRange : BreachEasyRange;

        let path = undefined;

        const easyPath = creep.room.findPath
        (
            creep.pos,
            controlPos,
            {
                ignoreCreeps: false,
                ignoreDestructibleStructures: false,
                ignoreRoads: true,
                maxRooms: 1,
                range: easyDistance,
                maxOps: 500,

                serialize: false // ! to be used for position check
            }
        );

        if (easyPath.length > 0)
        {
            const last = easyPath[easyPath.length - 1];

            if (controlPos.inRangeTo(last.x, last.y, easyDistance))
            {
                // because expect serialized
                path = Room.serializePath(easyPath);
            }
        }

        if (path === undefined)
        {
            path = creep.room.findPath
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
        }

        creep.memory._breach_  = path;
        creep.memory._breachI_ = 0;
        creep.memory._breachT_ = Game.time;
    }

    const path = Room.deserializePath(creep.memory._breach_);
    creep.room.visual.poly(path);

    let next = undefined;

    for (let i = creep.memory._breachI_; i < path.length; ++i)
    {
        const pathItem = path[i];

        const supposeNowX = pathItem.x - pathItem.dx;
        const supposeNowY = pathItem.y - pathItem.dy;

        if (creep.pos.x == supposeNowX && creep.pos.y == supposeNowY)
        {
            next = pathItem;
            creep.memory._breachI_ = i;
            break;
        }
    }

    if (next)
    {
        let target = undefined;

        const t = Math.max(creep.pos.y - 1, 0);
        const l = Math.max(creep.pos.x - 1, 0);
        const b = Math.min(creep.pos.y + 1, 49);
        const r = Math.min(creep.pos.x + 1, 49);

        const around = creep.room.lookForAtArea
        (
            LOOK_STRUCTURES,
            t, // top
            l, // left
            b, // bottom
            r, // right
            true // as array
        );

        let withdraws = [];

        for (const itemKey in around)
        {
            const item = around[itemKey];
            const struct = item.structure;
            withdraws.push(struct);

            if (item.x != next.x || item.y != next.y)
                continue;

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

        if (withdraws.length > 0)
        {
            creep.withdrawFromAdjacentEnemyStructures(withdraws);
        }

        let rc = undefined;
        if (target)
        {
            rc = creep.dismantle(target);
        }
        else
        {
            rc = creep.move(next.direction);
            // trick - expect that movement actually happened
            // search step from +1 of current
            if (rc == OK)
            {
                ++creep.memory._breachI_;
            }
        }

        // extend
        if (rc == OK)
        {
            creep.memory._breachT_ = Game.time;
        }
    }
    else
    {
        creep.memory._breach_  = undefined;
        creep.memory._breachI_ = undefined;
        creep.memory._breachT_ = undefined;
    }
};

beetle.flagPrepare = function(flag)
{
    if (flag.room)
    {
        const breechers = flag.pos.findInRange(FIND_MY_CREEPS, BreachCompleteRange);
        if (breechers.length > 0)
        {
            return this.FLAG_REMOVE;
        }
    }

    return this.FLAG_SPAWN;
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
