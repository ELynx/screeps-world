'use strict';

var Controller = require('controller.template');

var controllerController = new Controller('controller');

controllerController.actRange = 3;

controllerController.act = function(controller, creep)
{
    return this.wrapIntent(creep, 'upgradeController', controller);
};

controllerController.targets = function(room)
{
    return [room.controller];
};

controllerController.register();

module.exports = controllerController;
