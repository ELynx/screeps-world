'use strict';

var Tasked = require('tasked.template');

var claim = new Tasked('claim');

claim.creepAtDestination = function(creep)
{
    const controller = creep.room.controller;

    if (!controller)
    {
        creep.unlive();
        return;
    }

    let rc   = ERR_TIRED;
    let wait = CREEP_CLAIM_LIFE_TIME;

    if (controller.hostileOrUnowned())
    {
        if (creep.pos.isNearTo(controller))
        {
            if (creep.memory.clmt === undefined)
            {
                creep.memory.clmt = Game.time;
            }

            let sign = '';

            if (controller.owner && controller.owner.username != creep.owner.username)
            {
                sign = 'Your base is under attack';
                rc = creep.attackController(controller);

                if (controller.level == 1 && controller.ticksToDowngrade < creep.ticksToLive)
                {
                    // controller will drop before creep expires
                    rc = OK;
                }
                else
                {
                    // in case of early arrival, see if creep can wait it out
                    wait = controller.upgradeBlocked;
                }
            }
            else if (controller.reservation && controller.reservation.username != creep.owner.username)
            {
                sing = 'Taking over';
                rc = creep.attackController(controller);
            }
            else
            {
                let myRooms = 0;
                for (const roomName in Game.rooms)
                {
                    const someRoom = Game.rooms[roomName];
                    if (someRoom.canControlStructures())
                    {
                        ++myRooms;
                    }
                }

                if (Game.gcl.level > myRooms)
                {
                    sign = '';
                    rc = creep.claimController(controller);
                }
                else
                {
                    sign = 'I was here';
                    rc = creep.reserveController(controller);
                }
            }

            if (controller.sign)
            {
                if (controller.sign.text != sign || controller.sign.username != creep.owner.username)
                {
                    creep.signController(controller, sign);
                }
            }
            else if (sign.length > 0)
            {
                creep.signController(controller, sign);
            }
        } // end of creep is near pos
        else
        {
            creep.moveToWrapper(controller, { maxRooms: 1, reusePath: 50, range: 1 });
            rc = OK; // keep walking
        }
    } // end of harmable controller

    // filter out early arrivals
    if (rc == ERR_TIRED && creep.ticksToLive < wait)
    {
        const ticksToArrive = Game.time - (creep.memory.clmt || 0);
        const ticksBlocked  = wait;
        const spawnAfter = Game.time + ticksBlocked - ticksToArrive;

        let flag = Game.flags[creep.memory.flag];
        if (flag)
        {
            flag.memory.after = spawnAfter;
        }

        creep.unlive();
    }
};

claim.flagPrepare = function(flag)
{
    if (flag.room)
    {
        const flagController = flag.room.controller;
        if (flagController)
        {
            // done about it
            if (!flagController.hostileOrUnowned()) return this.FLAG_REMOVE;
        }
        else
        {
            return this.FLAG_REMOVE;
        }
    }

    // save resources on not spamming
    if (flag.memory.after && flag.memory.after > Game.time)
    {
        return this.FLAG_IGNORE;
    }

    return this.FLAG_SPAWN;
};

claim.makeBody = function(spawn)
{
    const elvl = spawn.room.memory.elvl;

    // cannot spawn 650+
    if (elvl < 3) return [];

    if (elvl < 4)
    {
        // on swamp move 1 unit per 2 ticks
        // move up front to allow crawl even damaged
        // 750   50    50    600    50
        return [ MOVE, MOVE, CLAIM, MOVE ];
    }

    // on swamp move 1 unit per 1 tick
    // move up front to allow crawl even damaged
    // 850   50    50    50    50    600    50
    return [ MOVE, MOVE, MOVE, MOVE, CLAIM, MOVE ];
};

claim.register();

module.exports = claim;
