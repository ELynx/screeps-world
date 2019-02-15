var globals = require('globals');

var energyRestockController =
{
    /**
    @param {Room} room
    **/
    control: function(room)
    {
        globals.roomDebug(room, '<Energy controller - restock>');

        const targets = room.find(FIND_MY_STRUCTURES,
            {
                filter = function(structure)
                {
                    return (structure.structureType == STRUCTURE_SPAWN ||
                            structure.structureType == STRUCTURE_EXTENSION ||
                            structure.structureType == STRUCTURE_TOWER) &&
                            structure.energy < structure.energyCapacity;
                }
            }
        );

        if (targets.length == 0)
        {
            return;
        }

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
            const target = creeps[i].pos.findClosestByPath(targets);

            if (target)
            {
                globals.assignCreep(creeps[i], target);
                ++assigned;
            }
        }

        globals.roomDebug(room, 'Creeps checked ' + creeps.length);
        globals.roomDebug(room, 'Creeps assigned ' + assigned);
    }
};

module.exports = energyRestockController;
