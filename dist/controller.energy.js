var globals = require('globals');

// TODO energy on ground
var energyController =
{
    /**
    @param {Room} room
    @param {array<Creep>} creeps
    **/
    control: function(room, creeps)
    {
        const sources = room.find(FIND_SOURCES_ACTIVE);

        const targets = room.find(FIND_MY_STRUCTURES,
            {
                filter: (structure) =>
                {
                    return (structure.structureType == STRUCTURE_EXTENSION ||
                            structure.structureType == STRUCTURE_SPAWN ||
                            structure.structureType == STRUCTURE_TOWER) &&
                            structure.energy < structure.energyCapacity;
                }
            }
        );

        var toSource = 0;
        var toTarget = 0;

        for (var i = 0; i < creeps.length; ++i)
        {
            var creep = creeps[i];

            // TODO in one place?
            if (creep.dest == globals.NO_DESTINATION)
            {
                if (_.sum(creep.carry) < creep.carryCapacity)
                {
                    const source = creep.pos.findClosestByPath(sources);

                    if (source)
                    {
                        creep.dest = source.id;
                        ++toSource;
                        creep.say('🔅');
                    }
                }
                else
                {
                    const target = creep.pos.findClosestByPath(targets);

                    if (target)
                    {
                        creep.dest = target.id;
                        ++toTarget;
                        creep.say('🔄');
                    }
                }
            }
        }

        const textProp = { align: 'left' };

        room.visual.text('<Energy controller>',         globals.DEBUG_VISUAL_Y0, globals.DEBUG_VISUAL_X++, textProp);
        room.visual.text('Sent to source ' + toSource,  globals.DEBUG_VISUAL_Y0, globals.DEBUG_VISUAL_X++, textProp);
        room.visual.text('Sent to restock ' + toTarget, globals.DEBUG_VISUAL_Y0, globals.DEBUG_VISUAL_X++, textProp);
    }
};

module.exports = energyController;
