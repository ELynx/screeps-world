'use strict';

var Tasked = require('tasked.template');

var strelok = new Tasked('strelok');

strelok.patrolRoom = function(room)
{
    const flagName = this.id + '_' + room.name;

    const flag = Game.flags[flagName];
    if (flag)
    {
        const patrolUnits = Math.min(3, room.memory.elvl + 1);
        flag.setValue(patrolUnits);
    }
    else
    {
        // new room info, start with single guard
        const flagPos = room.getControlPos();
        flagPos.createFlagWithValue(flagName, 1);
    }
};

strelok.prepare = function()
{
    this.roomTargets = { };
    this.roomWounded = { };
    this.roomBoring  = { };

    for (const roomName in Game.rooms)
    {
        const room = Game.rooms[roomName];
        if (room && room.controller && room.controller.my)
        {
            this.patrolRoom(room);
        }
    }
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
        const creeps = creep.room.find(FIND_CREEPS);

        let targets = _.filter
        (
            creeps,
            function(creep)
            {
                return !creep.my;
            }
        );

        const structs = creep.room.find(
            FIND_STRUCTURES,
            {
                filter: function(structure)
                {
                    // for future marauding
                    if (structure.structureType == STRUCTURE_STORAGE ||
                        structure.structureType == STRUCTURE_CONTAINER ||
                        structure.structureType == STRUCTURE_TERMINAL)
                    {
                        return false;
                    }

                    // TODO wall breach
                    if (structure.structureType == STRUCTURE_WALL)
                    {
                        return false;
                    }

                    // please don't hunt roads
                    if (structure.structureType == STRUCTURE_ROAD)
                    {
                        return false;
                    }

                    return !structure.my && structure.hits;
                }
            }
        );

        if (structs.length > 0)
        {
            targets = targets.concat(structs);
        }

        const wounded = _.filter
        (
            creeps,
            function(creep)
            {
                return creep.my && creep.hits < creep.hitsMax;
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

    creep.withdrawFromAdjacentStructures(targets);

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

                    creep.moveToWrapper(target, { maxRooms: 1, reusePath: reuse, range: 3 });
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

        // priority 1 - heal this
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
        const want = flag.getValue();

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

    if (elvl <= 1)
    {
        // 200   50    150
        return [ MOVE, RANGED_ATTACK ];
    }
    else if (elvl <= 2)
    {
        // 500   50    50    150            250
        return [ MOVE, MOVE, RANGED_ATTACK, HEAL ];
    }

    if (!this._bodyCache_)
    {
        this._bodyCache_ = { };
    }

    const cached = this._bodyCache_[elvl];
    if (cached)
    {
        return cached;
    }

    let tough  = 0;
    let move   = 0;
    let attack = 0;
    let heal   = 0;

    let budget = 800 + 500 * (elvl - 3);

    // add heal + two attack combo
    // 700 is 150 ranged x 2 + 250 heal x 1 + 50 move x 3
    while (budget >= 700 && (move + attack + heal <= 50 - 6))
    {
        move   = move   + 3;
        attack = attack + 2;
        heal   = heal   + 1;

        budget = budget - 700;
    }

    // add attack
    // 200 is 150 ranged x 1 + 50 move x 1
    while (budget >= 200 && (move + attack + heal <= 50 - 2))
    {
        move   = move   + 1;
        attack = attack + 1;

        budget = budget - 200;
    }

    // add move padding
    while (budget >= 50 && (move + attack + heal <= 50 - 1))
    {
        move   = move   + 1;

        budget = budget - 50;
    }

    // add tough padding
    if (budget >= 10 && (tough + move + attack + heal <= 50 - 1) && (tough + attack + heal < move))
    {
        tough  = tough  + 1;

        budget = budget - 10;
    }

    let a = new Array(tough);
    a.fill(TOUGH);

    let b = new Array(move);
    b.fill(MOVE);

    let c = new Array(attack);
    c.fill(RANGED_ATTACK);

    let d = new Array(heal);
    d.fill(HEAL);

    const body = a.concat(b).concat(c).concat(d);

    this._bodyCache_[elvl] = body;

    return body;
};

strelok.register();

module.exports = strelok;
