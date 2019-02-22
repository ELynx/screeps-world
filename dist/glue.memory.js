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

        //for(const id in Game.rooms)
        //{
        //    if(!Game.rooms[id])
        //    {
        //        delete Memory.rooms[id];
        //    }
        //}
    }
};

module.exports = memoryManager;
