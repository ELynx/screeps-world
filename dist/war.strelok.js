'use strict';

var Tasked = require('tasked.template');

var strelok = new Tasked('strelok');

strelok.allCreepsPrepare = function()
{
    this.roomBored   = { };
    this.roomTargets = { };
    this.roomWounded = { };
};

strelok.creepPrepare = function(creep)
{
    creep._canAttack_ = creep.getActiveBodyparts(RANGED_ATTACK) > 0;
    creep._canHeal_   = creep.getActiveBodyparts(HEAL) > 0;

    creep._canHealRanged_ = creep._canHeal_;

    // if hit start a war immediately
    // remember this fact to avoid blinking
    if (creep.hits < creep.hitsMax && !creep.memory.war)
    {
        creep.memory.dest = creep.pos.roomName;
        creep.memory.war = true;
    }
};

strelok.creepAtDestination = function(creep)
{
    const dest = creep.memory.dest;

    if (!this.roomTargets[dest])
    {
        let targets = creep.room.find(FIND_HOSTILE_CREEPS);
        const structs = creep.room.find(
            FIND_HOSTILE_STRUCTURES,
            {
                filter: function(structure)
                {
                    return structure.hits;
                }
            }
        );

        if (structs.length > 0)
        {
            targets = targets.concat(structs);
        }

        const wounded = creep.room.find(
            FIND_MY_CREEPS,
            {
                filter: function(creep)
                {
                    return creep.hits < creep.hitsMax;
                }
            }
        );

        this.roomTargets[dest] = targets;
        this.roomWounded[dest] = wounded;
    }

    const distanceToCenter = creep.pos.getRangeTo(25, 25);

    let targets = _.filter(
        this.roomTargets[dest],
        function(hostile)
        {
            // for future marauding
            if (hostile.structureType == STRUCTURE_STORAGE ||
                hostile.structureType == STRUCTURE_TERMINAL)
            {
                return false;
            }

            if (hostile.structureType == STRUCTURE_RAMPART)
            {
                // only forward
                return hostile.pos.getRangeTo(25, 25) <= distanceToCenter;
            }

            return true;
        }
    );

    const target = creep.pos.findClosestByRange(targets);
    if (target)
    {
        if (creep._canAttack_)
        {
            const rangeToTarget = creep.pos.getRangeTo(target);

            if (rangeToTarget <= 3)
            {
                // come a little bit closer
                if (rangeToTarget > 2)
                {
                    if (creep._canMove_ && creep.fatigue == 0)
                    {
                        if (creep.moveTo(target, { noPathFinding: true }) == ERR_NOT_FOUND)
                        {
                            creep.move(creep.pos.getDirectionTo(target));
                        }
                    }
                }

                // carpet bombing
                let mass = false;

                // find out if mass will hit someone else
                for (let i = 0; i < targets.length && !mass; ++i)
                {
                    const secondary = targets[i];

                    if (secondary.id == target.id)
                    {
                        continue;
                    }

                    if (creep.pos.inRangeTo(secondary, 3))
                    {
                        mass = true;
                    }
                }

                // do actual attack
                let rc = undefined;
                if (mass)
                {
                    rc = creep.rangedMassAttack();
                }
                else
                {
                    rc = creep.rangedAttack(target);
                }

                creep._canHealRanged_ = creep._canHealRanged_ && rc != OK;
            }
            else
            {
                if (creep._canMove_ && creep.fatigue == 0)
                {
                    // STRATEGY follow creep tightly
                    const reuse = target.structureType ? 10 : 0;

                    creep.moveTo(target, { maxRooms: 1, reusePath: reuse, range: 3 });
                }
            }
        } // end of if has ranged bpart
    } // end of if target
    else
    {
        // no targets

        // if creep lived long enough
        if (creep.ticksToLive < 2)
        {
            this.roomBored[dest] = true;
        }

        // move closer to center
        if (creep._canMove_ && !creep.pos.inRangeTo(25, 25, 15))
        {
            creep.moveTo(25, 25, { maxRooms:1, range: 15 });
        }
    } // end of if no target

    if (creep._canHeal_ || creep._canHealRanged_)
    {
        if (creep._canHeal_ && creep.hits < creep.hitsMax)
        {
            creep.heal(creep);
        }
        else
        {
            if (creep._canHealRanged_)
            {
                creep.healClosest(this.roomWounded[dest]);
            }
            else
            {
                creep.healAdjacent(this.roomWounded[dest]);
            }
        }
    }
};

strelok.creepRoomTravel = function(creep)
{
    this._creepRoomTravel(creep);

    if (creep._canHeal_)
    {
        if (creep.hits < creep.hitsMax)
        {
            creep.heal(creep);
        }
        else if (this.roomWounded[creep.pos.roomName] &&
                 this.roomWounded[creep.pos.roomName].length > 0)
        {
            creep.healClosest(this.roomWounded[creep.pos.roomName]);
        }
    }
};

strelok.flagPrepare = function(flag)
{
    const want = flag.getValue();

    if (want < 1)
    {
        flag.remove();
        return false;
    }

    const bored = (flag.room.controller && flag.room.controller.my) ? false : (this.roomBored[flag.pos.roomName] || false);

    // automatically stop trashing low threat rooms
    if (want == 1 && bored)
    {
        flag.remove();
        return false;
    }

    return true;
};

strelok.makeBody = function(spawn)
{
    const elvl = spawn.room.memory.elvl;

    if (elvl < 1)
    {
        return [ MOVE, RANGED_ATTACK ];
    }
    else if (elvl <= 3)
    {
        return [ MOVE, MOVE, RANGED_ATTACK, HEAL ];
    }
    else
    {
        return [ MOVE, MOVE, MOVE, MOVE, MOVE, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, HEAL ];
    }
};

strelok.register();

module.exports = strelok;
