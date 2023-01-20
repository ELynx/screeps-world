'use strict';

var Controller = require('controller.template');

var buildController = new Controller('build');

buildController.actRange = 3;

buildController.act = function(site, creep)
{
    return creep.build(site) == OK;
};

buildController.targets = function(room)
{
    const allSites = room.find(FIND_CONSTRUCTION_SITES);

    // STRATEGY build priorities

    const spawns = _.filter(
        allSites,
        {
            structureType: STRUCTURE_SPAWN
        }
    );
    if (spawns.length > 0) return spawns;

    const extensions = _.filter(
        allSites,
        {
            structureType: STRUCTURE_EXTENSION
        }
    );
    if (extensions.length > 0) return extensions;

    return allSites;
};

buildController.register();

module.exports = buildController;
