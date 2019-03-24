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
    // TODO build priorities
    //const spawns = room.find(FIND_MY_SPAWNS);
    //const hasSpawn = spawns.length > 0;
    //(hasSpawn || site.structureType == STRUCTURE_SPAWN);

    // TODO what can be built with creep on
    // roads
    // ramparts?
    return this._lookAroundCreep(
        room,
        LOOK_CONSTRUCTION_SITES,
        function(site)
        {
            return site.my && !site.pos.isEqualTo(creep.pos);
        },
        creep
    );
};

buildController.register();

module.exports = buildController;
