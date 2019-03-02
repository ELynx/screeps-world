var Controller = require('controller.template');

var controllerController = new Controller('controller');

controllerController.actRange = 3;

controllerController.act = function(controller, creep)
{
    // TODO check downgrade time
    creep.upgradeController(controller);

    return false; //not sticky, otherwise restockable creeps stuck at this task
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
