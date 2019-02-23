var Controller = require('controller.template');

var buildController = new Controller('build');

// group effort from distance 3
buildController.actDistance = 3;

buildController.act = function(site, creep)
{
    return creep.build(site) == OK;
};

buildController.findTargets = function(room)
{
    return room.find(FIND_MY_CONSTRUCTION_SITES);
};

module.exports = buildController;
