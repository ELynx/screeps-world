var Controller = require('controller.template');

var buildController = new Controller('build');

buildController.actDistance = 3;

buildController.act = function(target, creep)
{
    if (target instanceof ConstructionSite)
    {
        return creep.build(target) == OK;
    }
    else
    {
        // TODO decide
        creep.repair(target);
        return false; // not sticky
    }
};

buildController.targets = function(room)
{
    const sites = room.find(FIND_MY_CONSTRUCTION_SITES);

    const structs = room.find(FIND_STRUCTURES,
        {
            filter: function(structure)
            {
                // destructible walls
                if (structure instanceof StructureWall && structure.hits)
                {
                    // STRATEGY TODO depend on level
                    return structure.hits < 1000;
                }
                else if (structure instanceof StructureRoad && structure.hits)
                {
                    // STRATEGY TODO don't run with every booboo
                    return structure.hits < Math.ceil(structure.maxHits * 0.5);
                }
                else if (structure instanceof OwnedStructure && structure.my)
                {
                    // STRATEGY TODO don't run with every booboo
                    return structure.hits < Math.ceil(structure.maxHits * 0.95);
                }

                return false;
            }
        }
    );

    return sites.concat(structs);
};

module.exports = buildController;
