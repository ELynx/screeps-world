'use strict';

var globals    = require('globals');
var Controller = require('controller.template');

var repairController = new Controller('repair');

const TargetBarrierHp = [
    0,
    5000,
    10000,
    15000,
    20000,
    25000,
    1000000
];

const TargetRoadHpMultiplier = [
    0.0,
    0.16,
    0.33
];

const TargetStructureHpMultiplier = [
    0.75, // repair buildings in rooms that are just attached
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

repairController.oddOrEven = 1;

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
        return globals.WARN_LAST_INTENT;
    }

    return this.wrapIntent(creep, 'repair', target);
};

repairController.targets = function(room)
{
    // STRATEGY don't run with every booboo
    let   barrHp    = fromArray(TargetBarrierHp,             room.memory.elvl);
    const roadMult  = fromArray(TargetRoadHpMultiplier,      room.memory.elvl);
    const otherMult = fromArray(TargetStructureHpMultiplier, room.memory.elvl);

    // STRATEGY from level 6 room builds up walls
    if (room.memory.elvl > 5)
    {
        const LevelHp = (room.memory.wlvl || 0) * 1000;
        const NotLessThan = fromArray(TargetBarrierHp, room.memory.elvl - 1);
        const NotMoreThan = barrHp;

        barrHp = LevelHp;

        if (barrHp < NotLessThan)
        {
            barrHp = NotLessThan;
        }
        else if (barrHp > NotMoreThan)
        {
            barrHp = NotMoreThan;
        }
    }

    // STRATEGY some histeresis
    const rampHp = Math.min(Math.ceil(1.2 * barrHp), barrHp + 4500);

    return room.find(
        FIND_STRUCTURES,
        {
            filter: function(structure)
            {
                if (!structure.hits || structure.hits >= structure.hitsMax) return false;

                if (!structure.isActiveSimple()) return false;

                if (structure.structureType == STRUCTURE_WALL)
                {
                    if (structure.hits < barrHp)
                    {
                        structure._targetHp_ = barrHp;
                        return true;
                    }
                }
                else if (structure.structureType == STRUCTURE_RAMPART)
                {
                    if (structure.hits < barrHp)
                    {
                        structure._targetHp_ = rampHp;
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
                else
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
            }
        }
    );
};

repairController.register();

module.exports = repairController;
