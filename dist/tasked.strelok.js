'use strict';

var Tasked = require('tasked.template');

var strelok = new Tasked('strelok');

strelok.prepare = function()
{
    this.roomTargets = { };
    this.roomWounded = { };
    this.roomBoring  = { };
};

strelok.creepPrepare = function(creep)
{
    creep._canAttack_     = creep.getActiveBodyparts(RANGED_ATTACK) > 0;
    creep._canHeal_       = creep.getActiveBodyparts(HEAL) > 0;
    creep._canHealRanged_ = creep._canHeal_;

    // if hit start a war immediately
    if (creep.hits < creep.hitsMax && !creep.memory.war)
    {
        creep.setControlRoom(creep.pos.roomName);
        creep.memory.war = true;
    }
};

strelok.creepAtDestination = function(creep)
{
    const dest = creep.pos.roomName;

    if (!this.roomTargets[dest])
    {
        let targets = creep.room.find(FIND_HOSTILE_CREEPS);
        const structs = creep.room.find(
            FIND_HOSTILE_STRUCTURES,
            {
                filter: function(structure)
                {
                    // for future marauding
                    if (structure.structureType == STRUCTURE_STORAGE ||
                        structure.structureType == STRUCTURE_TERMINAL)
                    {
                        return false;
                    }

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

    const rushPos = creep.getControlPos();
    const distanceToFlag = creep.pos.getRangeTo(rushPos);

    let targets = _.filter(
        this.roomTargets[dest],
        function(hostile)
        {
            if (hostile.structureType == STRUCTURE_RAMPART)
            {
                // only forward
                return hostile.pos.getRangeTo(rushPos) <= distanceToFlag;
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
                // maintain distance
                if (creep._canMove_)
                {
                    let toFrom = 0;

                    if (target.structureType)
                    {
                        if (rangeToTarget > 1)
                        {
                            toFrom = 1;
                        }
                    }
                    else
                    {
                        if (rangeToTarget > 2)
                        {
                            toFrom = 1;
                        }
                        else if (rangeToTarget < 2)
                        {
                            toFrom = -1;
                        }
                    }

                    if (toFrom != 0)
                    {
                        const direction = toFrom > 0 ? creep.pos.getDirectionTo(target) : target.pos.getDirectionTo(creep);
                        creep.move(direction);
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
            } // end of traget in firing range
            else
            {
                if (creep._canMove_)
                {
                    // STRATEGY follow creep tightly
                    const reuse = target.structureType ? 10 : 0;

                    creep.moveTo(target, { plainCost: 1, swampCost: 5, maxRooms: 1, reusePath: reuse, range: 3 });
                }
            }
        } // end of if has ranged bpart
    } // end of if target
    else
    {
        // no targets
        this._coastToHalt(creep);

        // if creep lived long enough
        if (creep.ticksToLive < 2)
        {
            this.roomBoring[dest] = true;
        }
    } // end of if no target

    if (creep._canHeal_ || creep._canHealRanged_)
    {
        const healTargets = this.roomWounded[dest];

        // priority 1 - heal self
        if (creep._canHeal_ && creep.hits < creep.hitsMax)
        {
            creep.heal(creep);
        }
        // priority 2 - heal anyone else
        else if (creep._canHealRanged_)
        {
            // actually check for creep directly nearby is inside
            creep.healClosest(healTargets);
        }
        // priority 3 - heal anyone else directly nearby - in case of ranged attack
        else if (creep._canHeal_)
        {
            creep.healAdjacent(healTargets);
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

    if (flag.room &&
        flag.room.controller &&
        flag.room.controller.my)
    {
        // if in currently owned room aggro only when threat level is above "minimal"
        if (!(flag.room.memory.threat > 1))
        {
            // keep flag but don't spawn
            return this.FLAG_IGNORE;
        }
    }
    else
    {
        // automatically stop trashing low threat rooms
        if (want == 1 && this.roomBoring[flag.pos.roomName])
        {
            return this.FLAG_REMOVE;
        }
    }

    return this.FLAG_SPAWN;
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
