var globals = require('globals');

var buildController =
{
    /**
    ID of controller
    **/
    id: 'build',

    /**
    @param {ConstructionSite} site
    @param {Creep} creep adjacent to source
    @return True if creep was acted upon
    **/
    act: function(site, creep)
    {
        return creep.build(site) == OK;
    },

    /**
    @param {Room} room
    **/
    control: function(room)
    {
        globals.roomDebug(room, '<Build controller>');

        const sites = room.find(FIND_MY_CONSTRUCTION_SITES);

        if (sites.length == 0)
        {
            return;
        }

        // TODO unify in one place
        const creeps = room.find(FIND_MY_CREEPS,
            {
                filter: function(creep)
                {
                    return globals.creepNotAssigned(creep) && creep.carry.energy > 0;
                }
            }
        );

        var assigned = 0;

        for (var i = 0; i < creeps.length; ++i)
        {
            const site = creeps[i].pos.findClosestByPath(sites);

            if (site)
            {
                globals.assignCreep(this.id, site, creeps[i]);
                ++assigned;
            }
        }

        globals.roomDebug(room, 'Creeps checked ' + creeps.length);
        globals.roomDebug(room, 'Creeps assigned ' + assigned);
    }
};

module.exports = buildController;
