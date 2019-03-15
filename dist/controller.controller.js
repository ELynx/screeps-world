'use strict';

var Controller = require('controller.template');

var controllerController = new Controller('controller');

controllerController.actRange = 3;

controllerController.extra = function(controller)
{
    // STRATEGY maximum number of upgradeController calls per assignment
    return 10;
};

controllerController.act = function(controller, creep)
{
    const rc = creep.upgradeController(controller);

    if (rc == OK)
    {
        return --creep.memory.xtra >= 0;
    }

    return false; 
};

controllerController.staticTargets = function(room)
{
    if (room.controller && room.controller.my)
    {
        return [room.controller];
    }

    return [];
};

controllerController.register();

module.exports = controllerController;
