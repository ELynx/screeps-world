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
                creep.attackController(controller);
            }
            else if (controller.reservation && controller.reservation.username != creep.owner.username)
            {
                sing = 'Taking over...';
                creep.attackController(controller);
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
                    controller.room.memory.sstr = creep.getSourceRoom();
                    creep.claimController(controller);                    
                }
                else
                {
                    sign = 'I was here';
                    creep.reserveController(controller);
                }
            }

            if (controller.sign && controller.sign.text != sign)
            {
                creep.signController(sign);
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

    if (elvl < 3) return [];

    // 770   10     50    10     50    600    50
    return [ TOUGH, MOVE, TOUGH, MOVE, CLAIM, MOVE ];
};

claim.register();

module.exports = claim;
