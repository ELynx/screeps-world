'use strict';

var Controller = require('controller.template');

var buildController = new Controller('build');

buildController.actRange = 3;

buildController.act = function(site, creep)
{
    return creep.build(site) == OK;
};

// TODO build priorities
buildController.staticTargets = function(room)
{
    let hasSpawn = false;

    const structures = room.find(FIND_STRUCTURES);
    for (let i = 0; i < structures.length; ++i)
    {
        const structure = structures[i];
        if (structure.my && structure.structureType == STRUCTURE_SPAWN)
        {
            hasSpawn = true;
            break;
        }
    }

    return room.find(
        FIND_CONSTRUCTION_SITES,
        {
            filter: function(site)
            {
                return site.my && (hasSpawn || site.structureType == STRUCTURE_SPAWN);
            }
        }
    );
};

buildController.register();

module.exports = buildController;
