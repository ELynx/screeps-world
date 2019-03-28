'use strict';

var memoryManager =
{
    /**
    Looply clean up of objects that Memory remembers but no longer relevant.
    **/
    cleanup: function()
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
    }
};

module.exports = memoryManager;
