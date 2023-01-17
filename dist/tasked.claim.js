'use strict';

var Tasked = require('tasked.template');

var claim = new Tasked('claim');

claim.creepAtDestination = function(creep)
{
    const controller = creep.room.controller;

    if (controller && !controller.my)
    {
        if (creep.pos.isNearTo(controller))
        {
            let sign = '';

            if (controller.owner && controller.owner.username != creep.owner.username)
            {
                sign = 'BAHAHAHA';
                const rc = creep.attackController(controller);
                //console.log(rc + ' attacking1 ' + controller.id);
            }
            else if (controller.reservation && controller.reservation.username != creep.owner.username)
            {
                sing = 'Taking over...';
                const rc = creep.attackController(controller);
                //console.log(rc + ' attacking2 ' + controller.id);
            }
            else
            {
                let myRooms = 0;
                for (let roomName in Game.rooms)
                {
                    const someRoom = Game.rooms[roomName];
                    if (someRoom.controller && someRoom.controller.my)
                    {
                        ++myRooms;
                    }
                }

                if (Game.gcl.level > myRooms)
                {
                    sign = '';
                    const rc = creep.claimController(controller);    
                    //console.log(rc + ' claiming ' + controller.id);                
                }
                else
                {
                    sign = 'I was here';
                    const rc = creep.reserveController(controller);
                    //console.log(rc + ' reserving ' + controller.id);
                }
            }

            if (controller.sign)
            {
                if (controller.sign.text != sign || controller.sign.username != creep.owner.username)
                {
                    const rc = creep.signController(controller, sign);
                    //console.log(rc + ' signing1 ' + controller.id);
                }
            }
            else if (sign.length > 0)
            {
                    const rc = creep.signController(controller, sign);
                    //console.log(rc + ' signing1 ' + controller.id);
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
    if (flag.room && flag.room.controller && flag.room.controller.my)
    {
        return this.FLAG_REMOVE;
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
