var Controller = require('controller.template');

var buildController = new Controller('build');

buildController.actRange = 3;

buildController.act = function(site, creep)
{
    return creep.build(site) == OK;
};

buildController.staticTargets = function(room)
{
    return room.find(FIND_MY_CONSTRUCTION_SITES);
};

buildController.register();

module.exports = buildController;
