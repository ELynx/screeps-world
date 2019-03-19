'use strict';

var Controller = require('controller.template');

var redAlert = new Controller('redalert');

redAlert.actRange = 3;

redAlert.extra = function(controller)
{
    return controller._targetTicks_;
};

redAlert.act = function(controller, creep)
{
    const rc = creep.upgradeController(controller);

    if (rc == OK)
    {
        return creep.memory.xtra > controller.ticksToDowngrade;
    }

    return false;
};

redAlert.staticTargets = function(room)
{
    if (room.controller &&
        room.controller.my &&
        room.controller.level > 0 &&
       !room.controller.upgradeBlocked)
    {
        const targetTicks = Math.floor(CONTROLLER_DOWNGRADE[room.controller.level] / 3);

        if (room.controller.ticksToDowngrade < targetTicks)
        {
            room.controller._targetTicks_ = 2 * targetTicks;
            return [room.controller];
        }
    }

    return [];
};

redAlert.precondition = function(room)
{
    // TODO integrate
    this._staticTargetCache = this.staticTargets(room);

    return this._staticTargetCache.length > 0;
};

redAlert.register();

module.exports = redAlert;
