'use strict';

function cleanupMemory()
{
    for(const name in Memory.creeps)
    {
        if(!Game.creeps[name])
        {
            delete Memory.creeps[name];
        }
    }

    for(const name in Memory.rooms)
    {
        if(!Game.rooms[name])
        {
            delete Memory.rooms[name];
        }
    }
};

module.exports = cleanupMemory;
