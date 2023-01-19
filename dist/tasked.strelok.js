'use strict';

var Tasked = require('tasked.template');

var strelok = new Tasked('strelok');

strelok.markRoomForPatrol = function(room)
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
        // TODO think of room position
        const flagPos = new RoomPosition(25, 25, room.name);
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
            this.markRoomForPatrol(room);
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
                    // STRATEGY ingore resource management, even though it can be military
                    if (structure.structureType == STRUCTURE_CONTAINER ||
                        structure.structureType == STRUCTURE_EXTRACTOR ||
                        structure.structureType == STRUCTURE_FACTORY ||
                        structure.structureType == STRUCTURE_LAB ||
                        structure.structureType == STRUCTURE_LINK ||
                        structure.structureType == STRUCTURE_STORAGE ||
                        structure.structureType == STRUCTURE_TERMINAL)
                    {
                        return false;
                    }

                    if (structure.structureType == STRUCTURE_WALL)
                    {
                        return false;
                    }

                    // please don't hunt roads
                    if (structure.structureType == STRUCTURE_ROAD)
                    {
                        return false;
                    }

                    // ignore everything without hit points
                    return !structure.my && structure.hits;
                }
            }
        );

        if (structs.length > 0)
        {
            targets = targets.concat(structs);
        }

        if (creep.room._aggro_ && creep.room._aggro_.length > 0)
        {
            targets = targets.concat(creep.room._aggro_);
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
            if (hostile._aggroTarget_)
            {
                return true;
            }

            if (hostile.structureType == STRUCTURE_RAMPART)
            {
                // only forward
                return hostile.pos.getRangeTo(rushPos) <= distanceToFlag;
            }

            return true;
        }
    );

    const fireTarget = creep.pos.findClosestByRange(targets);

    let moveTarget = undefined;
    const prio = _.filter(
        targets,
        function(target)
        {
            return target.pos.x == rushPos.x && target.pos.y == rushPos.y;
        }
    );

    if (prio.length > 0)
    {
        moveTarget = prio[0];
    }
    else
    {
        moveTarget = fireTarget;
    }

    if (fireTarget)
    {
        const rangeToFireTarget = creep.pos.getRangeTo(fireTarget);

        if (creep._canAttack_)
        {
            if (rangeToFireTarget <= 3)
            {
                // carpet bombing
                let mass = false;

                // find out if mass will hit someone else
                for (let i = 0; i < targets.length && !mass; ++i)
                {
                    const secondary = targets[i];

                    if (secondary.id == fireTarget.id)
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
                    rc = creep.rangedAttack(fireTarget);
                }

                creep._canHealRanged_ = creep._canHealRanged_ && rc != OK;
            } // end of traget in firing range
        } // end of if has ranged bpart

        if (creep._canMove_)
        {
            // ballet when close
            if (rangeToFireTarget <= 3 && fireTarget.id == moveTarget.id)
            {
                let toFrom = 0;

                if (fireTarget.structureType)
                {
                    if (rangeToFireTarget > 1)
                    {
                        toFrom = 1;
                    }
                }
                else
                {
                    if (rangeToFireTarget > 2)
                    {
                        toFrom = 1;
                    }
                    else if (rangeToFireTarget < 2)
                    {
                        toFrom = -1;
                    }
                }

                if (toFrom != 0)
                {
                    const direction = toFrom > 0 ? creep.pos.getDirectionTo(fireTarget) : fireTarget.pos.getDirectionTo(creep);
                    creep.move(direction);
                }
            }
            else
            {
                // STRATEGY follow creep tightly
                const reuse = moveTarget.structureType ? 10 : 0;
                // STRATEGY bump into structure
                const range = moveTarget.structureType ?  1 : 3;
                creep.moveToWrapper(moveTarget, { maxRooms: 1, reusePath: reuse, range: range });
            }
        }
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

    // 700 for base combo and 200 per big room climb after 3
    let budget = 700 + 200 * Math.floor((elvl - 3) / 4);

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
