'use strict';

var Controller = require('controller.template');

var buildController = new Controller('build');

buildController.actRange = 3;

buildController.focusDynamic = true;

buildController.act = function(site, creep)
{
    return creep.build(site) == OK;
};

buildController.dynamicTargets = function(room, creep)
{
    // hotplug
    const spawns = room.find(FIND_MY_SPAWNS);
    const hasSpawn = spawns.length > 0;

    return this._lookAroundCreep(
        room,
        LOOK_CONSTRUCTION_SITES,
        function(site)
        {
            return site.my &&
                   !site.pos.isEqualTo(creep.pos) && // TODO OK on roads
                   (hasSpawn || site.structureType == STRUCTURE_SPAWN); // hotplug
        },
        creep
    );
};

buildController.register();

module.exports = buildController;
