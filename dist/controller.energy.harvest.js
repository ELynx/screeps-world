var globals = require('globals');

// TODO energy on ground
var energyHarvestController =
{
    /**
    ID of controller
    **/
    id: 'energy.harvest',

    /**
    @param {Source} source
    @param {Creep} creep adjacent to source
    @return True if creep was acted upon
    **/
    act: function(source, creep)
    {
        var result = false;

        if (_.sum(creep.carry) < creep.carryCapacity)
        {
            result = creep.harvest(source) == OK;
        }

        return result;
    },

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
                globals.assignCreep(this.id, source, creeps[i]);
                ++assigned;
            }
        }

        globals.roomDebug(room, 'Creeps checked ' + creeps.length);
        globals.roomDebug(room, 'Creeps assigned ' + assigned);
    }
};

module.exports = energyHarvestController;
