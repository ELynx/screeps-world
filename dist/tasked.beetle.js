'use strict';

var Tasked = require('tasked.template');

var beetle = new Tasked('beetle');

const BreachCompleteRange = 1;
const BreachEasyRange = 3;

beetle.prepare = function()
{
    for (const roomName in Game.rooms)
    {
        const room = Game.rooms[roomName];
        room._aggro_ = [];
    }
};

beetle.breachLength = function(breach)
{
    // https://github.com/screeps/engine/blob/78631905d975700d02786d9b666b9f97b1f6f8f9/src/utils.js#L555
    return breach.length - 4;
};

beetle.wipeBreach = function(creep)
{
    creep.memory._breachP_ = undefined;
    creep.memory._breachI_ = undefined;
    creep.memory._breachT_ = undefined;
};

beetle.creepAtDestination = function(creep)
{
    creep.purgeEnergy();

    let beHostile = true;

    if (Game.rooms.sim === undefined)
    {
        if (creep.room.controller && creep.room.controller.notHostile())
        {
            beHostile = false;
        }
    }

    // every N ticks refresh situation
    if (creep.memory._breachT_)
    {
        if (Game.time - creep.memory._breachT_ > 10)
        {
            this.wipeBreach(creep);
        }
    }

    // at the end of path refresh situation immediately
    if (creep.memory._breachP_ && creep.memory._breachI_)
    {
        if (this.breachLength(creep.memory._breachP_) <= creep.memory._breachI_)
        {
            this.wipeBreach(creep);
        }
    }

    let controlPos = creep.getControlPos();

    // after arriving on the spot, start running like headless chicken
    if (creep.pos.inRangeTo(controlPos, BreachCompleteRange))
    {
        // biased to center, as we need
        controlPos = new RoomPosition(
            Math.floor(Math.random() * 49),
            Math.floor(Math.random() * 49),
            controlPos.roomName
        );
    }

    // no path known
    if (creep.memory._breachP_ === undefined)
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
            if (controlPos.inRangeTo(last, easyDistance))
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
                    ignoreDestructibleStructures: beHostile,
                    maxRooms: 1,
                    range: hardDistance,

                    serialize: true
                }
            );
        }

        creep.memory._breachP_ = path;
        creep.memory._breachI_ = 0;
        creep.memory._breachT_ = Game.time;
    }

    const path = Room.deserializePath(creep.memory._breachP_);
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

        if (beHostile)
        {
            const [t, l, b, r] = creep.pos.squareArea(1);

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

                if (struct.hits === undefined)
                {
                    continue;
                }

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
        }

        let rc = undefined;
        if (target)
        {
            rc = creep.dismantle(target);
            // coordinate effort - ask nearbys to attack
            if (rc == OK)
            {
                target._aggroTarget_ = true;
                creep.room._aggro_.push(target);
            }
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
    if (Game.rooms[flag.pos.roomName])
    {
        // any creep of same alignment work, breach was complete
        const breached = flag.pos.hasInSquareArea
        (
            LOOK_CREEPS,
            BreachCompleteRange,
            function(creep)
            {
                return creep.myOrAlly();
            }
        );

        if (breached)
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
        // 250   50    50    50     100
        return [ MOVE, MOVE, CARRY, WORK ];
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

    // 300 for base combo and 150 per big room climb after 3
    const budget = 300 + 150 * Math.floor((elvl - 3) / 4);
    const pairs = Math.min(Math.floor(budget / 150), 25);

    let a = new Array(pairs);
    a.fill(MOVE);

    let b = new Array(pairs - 1);
    b.fill(WORK);

    // one spot for withdraw
    const body = a.concat([CARRY]).concat(b);

    this._bodyCache_[elvl] = body;

    return body;
};

beetle.register();

module.exports = beetle;
