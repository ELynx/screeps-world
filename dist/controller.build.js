var globals = require('globals');
var Controller = require('controller.template');

var buildController = new Controller('build');

const TargetWallHp = [
    0,
    1000,
    10000,
    30000
];

const TargetRoadHpMultiplier = [
    0.0,
    0.33,
    0.5,
    0.65
];

const TargetStructureHpMultiplier = [
    0.0,
    0.8,
    0.85,
    0.9
];

const fromArray = function(from, index)
{
    return from[index >= from.length ? from.length - 1 : index];
}

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

buildController.findTargets = function(room)
{
    const level = globals.loopCache[room.id].level;

    if (level == 0)
    {
        return [];
    }

    // STRATEGY don't run with every booboo
    const wallHp    = fromArray(TargetWallHp,                level);
    const roadMult  = fromArray(TargetRoadHpMultiplier,      level);
    const otherMult = fromArray(TargetStructureHpMultiplier, level);

    const sites = room.find(FIND_MY_CONSTRUCTION_SITES);

    const structs = room.find(FIND_STRUCTURES,
        {
            filter: function(structure)
            {
                if ((structure instanceof StructureWall || structure instanceof StructureRampart) && structure.hits) // destructible walls
                {
                    return structure.hits < wallHp;
                }
                else if (structure instanceof StructureRoad && structure.hits)
                {
                    return structure.hits < Math.ceil(structure.hitsMax * roadMult);
                }
                else if (structure instanceof OwnedStructure && structure.my)
                {
                    return structure.hits < Math.ceil(structure.hitsMax * otherMult);
                }

                return false;
            }
        }
    );

    return sites.concat(structs);
};

module.exports = buildController;
