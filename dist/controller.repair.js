var globals = require('globals');
var Controller = require('controller.template');

var buildController = new Controller('repair');

const TargetBarrierHp = [
    0,
    5000,
    10000,
    30000
];

const TargetRoadHpMultiplier = [
    0.0,
    0.33,
    0.5,
    0.66
];

const TargetStructureHpMultiplier = [
    0.0,
    0.8,
    0.85,
    0.9
];

/**
Get value from array with index capped at length.
**/
const fromArray = function(from, index)
{
    return from[index >= from.length ? from.length - 1 : index];
};

// solo effort from distance 3
buildController.actDistance = -3;

buildController.act = function(target, creep)
{
    // TODO sticky until target hp or error
    return creep.repair(target) == OK;
};

buildController.findTargets = function(room)
{
    const level = globals.loopCache[room.id].level;

    if (level == 0)
    {
        return [];
    }

    // STRATEGY don't run with every booboo
    const barrHp    = fromArray(TargetBarrierHp,             level);
    const roadMult  = fromArray(TargetRoadHpMultiplier,      level);
    const otherMult = fromArray(TargetStructureHpMultiplier, level);

    const structs = room.find(FIND_STRUCTURES,
        {
            filter: function(structure)
            {
                if (structure.hits && (structure instanceof StructureWall || structure instanceof StructureRampart))
                {
                    return structure.hits < barrHp;
                }
                else if (structure instanceof StructureRoad)
                {
                    return structure.hits < Math.ceil(structure.hitsMax * roadMult);
                }
                else if (structure.hits && /*structure instanceof OwnedStructure &&*/ structure.my)
                {
                    return structure.hits < Math.ceil(structure.hitsMax * otherMult);
                }

                return false;
            }
        }
    );

    return structs;
};

module.exports = buildController;
