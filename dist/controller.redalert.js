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
    if (controller.ticksToDowngrade >= CONTROLLER_DOWNGRADE[controller.level] ||
        controller.ticksToDowngrade >= creep.memory.xtra)
    {
        return false;
    }

    const rc = creep.upgradeController(controller);
    if (rc == OK) creep._energyUsed_ = true;
    return rc == OK;
};

redAlert.targets = function(room)
{
    if (room.controller &&
        room.controller.owner &&
        room.controller.level > 0 &&
       !room.controller.upgradeBlocked)
    {
        // STRATEGY safe mode could not be activated below 50% - 5000, use 5000 maneuver space
        const targetTicks = (CONTROLLER_DOWNGRADE[room.controller.level] / 2) - 2500;

        if (room.controller.ticksToDowngrade < targetTicks)
        {
            room.controller._targetTicks_ = targetTicks + 2500;
            return [room.controller];
        }
    }

    return [];
};

redAlert.register();

module.exports = redAlert;
