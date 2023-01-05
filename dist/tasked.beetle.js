'use strict';

var Tasked = require('tasked.template');

var beetle = new Tasked('beetle');

const BreachCompleteRange = 1;
const BreachEasyRange = 3;

beetle.wipeBreach = function(creep)
{
    creep.memory._breach_  = undefined;
    creep.memory._breachI_ = undefined;
    creep.memory._breachT_ = undefined;
};

beetle.creepAtDestination = function(creep)
{
    // every N ticks refresh situation if stuck
    if (creep.memory._breachT_)
    {
        if (Game.time - creep.memory._breachT_ > 10)
        {
            this.wipeBreach(creep);
        }
    }

    // at the end of path refresh situation immediately
    if (creep.memory._breach_ && creep.memory._breachI_)
    {
        if (creep.memory._breach_.length <= creep.memory._breachI_)
        {
            this.wipeBreach(creep);
        }
    }

    const controlPos = creep.getControlPos();

    // stop path calculation on arrival
    // TODO continue thrashing enemy afterwards
    if (creep.pos.inRangeTo(controlPos, BreachCompleteRange))
    {
        this.wipeBreach(creep);

        return;
    }

    // no path known
    if (creep.memory._breach_ === undefined)
    {
        let path = undefined;

        // how much long is remaining
        const toControlPos = controlPos.getRangeTo(creep.pos);

        // try to find a path to nearby location
        // detect obstacles so there is a chance to go through existing breaches
        // try to reach the place if nearby
        const easyDistance = toControlPos <= BreachEasyRange ? BreachCompleteRange : BreachEasyRange;
        const easyPath = creep.room.findPath
        (
            creep.pos,
            controlPos,
            {
                ignoreCreeps: false,
                ignoreDestructibleStructures: false,
                maxRooms: 1,
                range: easyDistance,
                maxOps: 500,

                serialize: false // ! to be used for position check
            }
        );

        // check if endpoint is within wanted range
        if (easyPath.length > 0)
        {
            const last = easyPath[easyPath.length - 1];

            if (controlPos.inRangeTo(last.x, last.y, easyDistance))
            {
                // because expect serialized
                path = Room.serializePath(easyPath);
            }
        }

        // no, easy path was not found, need to look through walls
        if (path === undefined)
        {
            // come a bit closer, do not plan a trip up to the point
            const hardDistance = Math.max(toControlPos - BreachEasyRange, BreachCompleteRange);
            path = creep.room.findPath
            (
                creep.pos,
                controlPos,
                {
                    ignoreCreeps: true,
                    ignoreDestructibleStructures: true,
                    maxRooms: 1,
                    range: hardDistance,

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
            creep.withdrawFromAdjacentStructures(withdraws);
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
    } // end of next is present
    else
    {
        this.wipeBreach(creep);
    }
};

beetle.flagPrepare = function(flag)
{
    if (flag.room)
    {
        // any creep of same alignment work, breach was complete
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

    if (elvl <= 1)
    {
        // 150   50    100
        return [ MOVE, WORK ];
    }
    else if (elvl <= 2)
    {
        // 450   50    50    50    100   100   100
        return [ MOVE, MOVE, MOVE, WORK, WORK, WORK ];
    }

    if (!this._bodyCache_)
    {
        this._bodyCache_ = { };
    }

    const cached = this._bodyCache_[elvl];
    if (cached)
    {
        return cached;
    }

    const budget = 800 + 500 * (elvl - 3);
    const pairs = Math.min(Math.floor(budget / 150), 25);

    let a = new Array(pairs);
    a.fill(MOVE);

    let b = new Array(pairs):
    b.fill(WORK);

    const body = a.concat(b);

    this._bodyCache_[elvl] = body;

    return body;
};

beetle.register();

module.exports = beetle;
