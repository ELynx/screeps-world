'use strict';

var Controller = require('controller.template');

var buildController = new Controller('build');

buildController.actRange = 3;

buildController.oddOrEven = 0;

buildController.act = function(site, creep)
{
    const rc = creep.build(site);
    if (rc == OK) creep._energyUsed_ = true;
    return rc == OK;
};

// STRATEGY build priorities
buildController._sites = function(room)
{
    const allSites = room.find(FIND_CONSTRUCTION_SITES);

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

buildController.targets = function(room)
{
    const sites = this._sites(room);
    if (sites.length == 0) return [];

    // cannot build when creep is on site
    const allCreeps = room.find(FIND_CREEPS);
    return _.filter(
        sites,
        function(site)
        {
            return !_.some(
                allCreeps,
                function(creep)
                {
                    return creep.pos.x == site.pos.x &&
                           creep.pos.y == site.pos.y;
                }
            );
        }
    );
};

buildController.register();

module.exports = buildController;
