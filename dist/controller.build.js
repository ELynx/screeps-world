var Controller = require('controller.template');

var buildController = new Controller('build');

buildController.actDistance = 3;

buildController.oneToOne = false;

buildController.act = function(site, creep)
{
    var rc = creep.build(site);

    // TODO more general solution
    // error handling, is creep standing on side
    if (rc == ERR_INVALID_TARGET && creep.pos.isEqualTo(site))
    {
        // move somewhere
        var result = PathFinder.search(
            creep.pos,
            {
                pos: site.pos,
                range: 1
            },
            {
                flee: true
            }
        );

        if (result.path.length > 0)
        {
            rc = creep.move(creep.pos.getDirectionTo(result.path[0]));
        }
        else
        {
            // invalidate as builder
            creep.drop(RESOURCE_ENERGY);

            return false;
        }
    }

    return rc == OK;
};

buildController.findTargets = function(room)
{
    return room.find(FIND_MY_CONSTRUCTION_SITES);
};

module.exports = buildController;
