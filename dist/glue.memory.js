var memoryManager =
{
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
