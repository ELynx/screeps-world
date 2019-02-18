var Controller = require('controller.template');

var controllerController = new Controller('controller');

controllerController.actDistance = 3;

controllerController.act = function(target, creep)
{
    creep.upgradeController(target);

    // STRATEGY don't hold creeps on this task
    return false;
};

controllerController.targets = function(room)
{
    if (room.controller && room.controller.my)
    {
        return [room.controller];
    }

    return [];
};

module.exports = controllerController;
