'use strict';

var Controller = require('controller.template');

var controllerController = new Controller('controller');

controllerController.actRange = 3;

// STRATEGY upgrade creep limit per room
controllerController.maxCreepsPerTargetPerTick = 5;

controllerController.act = function(controller, creep)
{
    return creep.upgradeController(controller) == OK;
};

controllerController.targets = function(room)
{
    if (room.controller && room.controller.my)
    {
        return [room.controller];
    }

    return [];
};

controllerController.register();

module.exports = controllerController;
