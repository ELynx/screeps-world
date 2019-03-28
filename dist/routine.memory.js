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
                continue;
            }

            var dism = Memory.rooms[name].dism;
            if (dism)
            {
                for (var i = 0; i < dism.length;)
                {
                    if (Game.getObjectById(dism[i]))
                    {
                        ++i;
                    }
                    else
                    {
                        dism.splice(i, 1);
                    }
                }

                if (Memory.rooms[name].dism.length == 0)
                {
                    delete Memory.rooms[name].dism;
                }
            }
        }
    }
};

module.exports = memoryManager;
