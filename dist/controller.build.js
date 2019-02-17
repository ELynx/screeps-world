var Controller = require('controller.template');

var buildController = new Controller('build');

buildController.actDistance = 3;

buildController.act = function(site, creep)
{
    return creep.build(site) == OK;
};

buildController.targets = function(room)
{
    return room.find(FIND_MY_CONSTRUCTION_SITES);
};

module.exports = buildController;
