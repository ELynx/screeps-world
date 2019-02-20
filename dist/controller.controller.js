var Controller = require('controller.template');

var controllerController = new Controller('controller');

controllerController.actDistance = 3;

controllerController.act = function(target, creep)
{
    // TODO check downgrade time
    creep.upgradeController(target);

    return false; //not sticky, otherwise stuck at this task
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
