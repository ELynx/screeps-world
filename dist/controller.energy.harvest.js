var globals = require('globals');

// TODO energy on ground
var energyHarvestController =
{
    /**
    @param {Room} room
    **/
    control: function(room)
    {
        globals.roomDebug(room, '<Energy controller - harvest>');

        const sources = room.find(FIND_SOURCES_ACTIVE);

        if (sources.length == 0)
        {
            return;
        }

        const creeps = room.find(FIND_MY_CREEPS,
            {
                filter: function(creep)
                {
                    // STRATEGY restock only empty, reduce runs to sources
                    return globals.creepNotAssigned(creep) && _.sum(creep.carry) == 0;
                }
            }
        );

        var assigned = 0;

        for (var i = 0; i < creeps.length; ++i)
        {
            const source = creeps[i].pos.findClosestByPath(sources);

            if (source)
            {
                globals.assignCreep(creeps[i], source);
                ++assigned;
            }
        }

        globals.roomDebug(room, 'Creeps checked ' + creeps.length);
        globals.roomDebug(room, 'Creeps assigned ' + assigned);
    }
};

module.exports = energyHarvestController;
