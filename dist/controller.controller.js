var Controller = require('controller.template');

var controllerController = new Controller('controller');

controllerController.actDistance = 3;

controllerController.act = function(target, creep)
{
    return creep.upgradeController(target) == OK;
};

controllerController.targets = function(room)
{
    if (room.controller)
    {
        return [room.controller];
    }

    return [];
};

module.exports = controllerController;
