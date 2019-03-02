var Controller = require('controller.template');

var repairController = new Controller('repair');

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

repairController.actRange = 3;

repairController.roomPrepare = function(room)
{
    this._prepareTargetCache(room);
    this._prepareRoomLevel(room);
};

repairController.observeMyCreep = function(creep)
{
    this._cacheTarget(creep);
}

repairController.act = function(target, creep)
{
    // TODO sticky until target hp or error
    return creep.repair(target) == OK;
};

repairController.staticTargets = function(room)
{
    if (this.roomLevel == 0)
    {
        return [];
    }

    // STRATEGY don't run with every booboo
    const barrHp    = fromArray(TargetBarrierHp,             this.roomLevel);
    const roadMult  = fromArray(TargetRoadHpMultiplier,      this.roomLevel);
    const otherMult = fromArray(TargetStructureHpMultiplier, this.roomLevel);

    // TODO reduce number of objects checked, eats CPU
    const structs = room.find(FIND_STRUCTURES,
        {
            filter: function(structure)
            {
                if (!structure.hits)
                {
                    return false;
                }

                if (structure.structureType == STRUCTURE_WALL || structure.structureType == STRUCTURE_RAMPART)
                {
                    return structure.hits < barrHp;
                }
                else if (structure.structureType == STRUCTURE_ROAD)
                {
                    return structure.hits < Math.ceil(structure.hitsMax * roadMult);
                }
                else if (structure.my)
                {
                    return structure.hits < Math.ceil(structure.hitsMax * otherMult);
                }

                return false;
            }
        }
    );

    return structs;
};

repairController.register();

module.exports = repairController;
