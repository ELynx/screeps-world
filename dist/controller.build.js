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
    const spawns = room.find(FIND_MY_SPAWNS);
    const hasSpawn = spawns.length > 0;

    // TODO build priorities
    return this._lookAroundCreep(
        room,
        LOOK_CONSTRUCTION_SITES,
        function(site)
        {
            return site.my && !site.pos.isEqualTo(creep.pos) && (hasSpawn || site.structureType == STRUCTURE_SPAWN);
        },
        creep
    );
};

buildController.register();

module.exports = buildController;
