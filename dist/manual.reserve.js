'use strict';

var reserve = function()
{
    var creep = Game.creeps['reserve'];

    if (creep)
    {
        if (creep.hits < creep.hitsMax)
        {
            delete Memory.reserve;
        }

        const dest = Memory.reserve ? Memory.reserve : undefined;

        if (!dest)
        {
           return;
        }

        const destRoom = new RoomPosition(25, 25, dest);

        if (creep.pos.roomName != destRoom.roomName)
        {
            if (creep.fatigue == 0)
            {
                // STRATEGY cache path roughly for the room, and just find a spot there
                creep.moveTo(destRoom, { reusePath: 50, range: 24 });
            }
        }
        else
        {
            const controller = creep.room.controller;

            if (controller)
            {
                if (controller.reservation)
                {
                    if (controller.reservation > 4999)
                    {
                        delete Memory.reserve;
                    }
                }

                if (creep.isNearTo(controller))
                {
                    creep.singController(controller, 'Has doing boits');
                    creep.reserveController(controller);
                }
                else
                {
                    creep.moveTo(controller);
                }
            }
        }
    }
    else
    {
        if (Memory.reserve && Memory.handspawn)
        {
            const spawn = Game.getObjectById(Memory.handspawn);

            if (spawn)
            {
                spawn.spawnCreep([CLAIM, MOVE], 'reserve');
            }
        }
    }
};

module.exports = reserve;
