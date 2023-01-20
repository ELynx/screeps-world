'use strict';

var Tasked = require('tasked.template');

var claim = new Tasked('claim');

claim.creepAtDestination = function(creep)
{
    const controller = creep.room.controller;

    if (controller && controller.hostileOrUnowned())
    {
        if (creep.pos.isNearTo(controller))
        {
            let sign = '';

            if (controller.owner && controller.owner.username != creep.owner.username)
            {
                sign = 'Base is under attack';
                const rc = creep.attackController(controller);
            }
            else if (controller.reservation && controller.reservation.username != creep.owner.username)
            {
                sing = 'Taking over...';
                const rc = creep.attackController(controller);
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
                    const rc = creep.claimController(controller);
                }
                else
                {
                    sign = 'I was here';
                    const rc = creep.reserveController(controller);
                }
            }

            if (controller.sign)
            {
                if (controller.sign.text != sign || controller.sign.username != creep.owner.username)
                {
                    const rc = creep.signController(controller, sign);
                }
            }
            else if (sign.length > 0)
            {
                const rc = creep.signController(controller, sign);
            }
        }
        else
        {
            creep.moveToWrapper(controller, { maxRooms: 1, reusePath: 50, range: 1 });
        }
    }
    else
    {
        this._coastToHalt(creep);
    }
};

claim.flagPrepare = function(flag)
{
    // done about it
    const flagRoom = Game.rooms[flag.pos.roomName];
    if (flagRoom)
    {
        const flagController = flagRoom.controller;
        if (flagController)
        {
            if (!flagController.hostileOrUnowned()) return this.FLAG_REMOVE;
        }
        else
        {
            return this.FLAG_REMOVE;
        }
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
