'use strict';

var claim = function()
{
    var creep = Game.creeps['claim'];

    if (creep)
    {
        if (creep.hits < creep.hitsMax)
        {
            delete Memory.claim;
        }

        const dest = Memory.claim ? Memory.claim : creep.pos.roomName;
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
                if (controller.level > 0)
                {
                    delete Memory.claim;
                }

                if (creep.pos.isNearTo(controller))
                {
                    creep.signController(controller, '');
                    creep.claimController(controller);
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
        if (Memory.claim && Memory.handspawn)
        {
            const spawn = Game.getObjectById(Memory.handspawn);

            if (spawn)
            {
                spawn.spawnCreep([CLAIM, MOVE], 'claim');
            }
        }
    }
};

module.exports = claim;
