var Controller = require('controller.template');

var buildController = new Controller('build');

buildController.actRange = 3;

buildController.act = function(site, creep)
{
    return creep.build(site) == OK;
};

buildController.dynamicTargets = function(room, creep)
{
    return this._lookAroundCreep(
        room,
        LOOK_CONSTRUCTION_SITES,
        function(site) { return site.my; },
        creep
    );
};

buildController.register();

module.exports = buildController;
