'use strict';

var Controller = require('controller.template');

var buildController = new Controller('build');

buildController.actRange = 3;
buildController.focusDynamic = true;

buildController.roomHasSpawn = undefined;

buildController.roomPrepare = function(room)
{
    // TODO build priorities
    const spawns = room.find(FIND_MY_SPAWNS);
    this.hasSpawn = spawns.length > 0;
};

buildController.act = function(site, creep)
{
    return creep.build(site) == OK;
};

buildController.dynamicTargets = function(room, creep)
{
    let self = this;

    // TODO OBSTACLE_OBJECT_TYPES
    return this._lookAroundCreep(
        room,
        LOOK_CONSTRUCTION_SITES,
        function(site)
        {
            return site.my && !site.pos.isEqualTo(creep.pos) && (self.hasSpawn || site.structureType == STRUCTURE_SPAWN);
        },
        creep
    );
};

buildController.register();

module.exports = buildController;
