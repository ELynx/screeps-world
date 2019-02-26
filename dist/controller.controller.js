var Controller = require('controller.template');

var controllerController = new Controller('controller');

controllerController.actDistance = 3;

controllerController.oneToOne = false;

controllerController.act = function(controller, creep)
{
    // TODO check downgrade time
    creep.upgradeController(controller);

    return false; //not sticky, otherwise restockable creeps stuck at this task
};

controllerController.findTargets = function(room)
{
    if (room.controller && room.controller.my)
    {
        return [room.controller];
    }

    return [];
};

module.exports = controllerController;
