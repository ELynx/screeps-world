'use strict';

var Controller = require('controller.template');

var repairController = new Controller('repair');

const TargetBarrierHp = [
    0,
    5000,
    10000,
    15000
];

const TargetRoadHpMultiplier = [
    0.0,
    0.16,
    0.33
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

repairController.extra = function(structure)
{
    return structure._targetHp_;
}

repairController.roomPrepare = function(room)
{
    this._prepareExcludedTargets(room);
};

repairController.observeMyCreep = function(creep)
{
    this._excludeTarget(creep);
}

repairController.act = function(target, creep)
{
    if (target.hits >= target.hitsMax ||
        target.hits >= creep.memory.xtra)
    {
        return false;
    }

    return creep.repair(target) == OK;
};

repairController.dynamicTargets = function(room, creep)
{
    if (room.memory.elvl == 0)
    {
        return [];
    }

    // STRATEGY don't run with every booboo
    const barrHp    = fromArray(TargetBarrierHp,             room.memory.elvl);
    const roadMult  = fromArray(TargetRoadHpMultiplier,      room.memory.elvl);
    const otherMult = fromArray(TargetStructureHpMultiplier, room.memory.elvl);

    return this._lookAroundCreep(
        room,
        LOOK_STRUCTURES,
        function(structure)
        {
            if (!structure.hits || structure.hits >= structure.hitsMax)
            {
                return false;
            }

            if (structure.structureType == STRUCTURE_WALL)
            {
                if (structure.hits < barrHp)
                {
                    structure._targetHp_ = barrHp;
                    return true;
                }
            }
            else if (structure.structureType == STRUCTURE_RAMPART &&
                     structure.my)
            {
                if (structure.hits < barrHp)
                {
                    // STRATEGY some histeresis
                    structure._targetHp_ = Math.ceil(1.2 * barrHp);
                    return true;
                }
            }
            else if (structure.structureType == STRUCTURE_ROAD)
            {
                const hp = Math.ceil(structure.hitsMax * roadMult);
                if (structure.hits < hp)
                {
                    structure._targetHp_ = hp;
                    return true;
                }
            }
            else if (structure.my || structure.structureType == STRUCTURE_CONTAINER)
            {
                const hp = Math.ceil(structure.hitsMax * otherMult);
                if (structure.hits < hp)
                {
                    // STRATEGY some histeresis, repair to top
                    structure._targetHp_ = structure.hitsMax;
                    return true;
                }
            }

            return false;
        },
        creep
    );
};

repairController.register();

module.exports = repairController;
