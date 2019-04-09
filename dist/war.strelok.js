'use strict';

var strelok = function()
{
    let creeps = _.filter(Game.creeps, function(creep) { return creep.name.startsWith('strelok'); });

    let roomCount   = { };
    let roomBored   = { };

    let roomTargets = { };
    let roomWounded = { };

    for (let i = 0; i < creeps.length; ++i)
    {
        let creep = creeps[i];

        const canMove   = creep.getActiveBodyparts(MOVE) > 0;
        const canAttack = creep.getActiveBodyparts(RANGED_ATTACK) > 0;
        let canHeal     = creep.getActiveBodyparts(HEAL) > 0;
        let canHealRanged = canHeal;

        // if hit start a war immediately
        // remember this fact to avoid blinking
        if (creep.hits < creep.hitsMax && !creep.memory.war)
        {
            creep.memory.dest = creep.pos.roomName;
            creep.memory.war = true;
        }

        const dest = creep.memory.dest;

        // count how many creeps are already going to destination
        let now = roomCount[dest] || 0;
        ++now;
        roomCount[dest] = now;

        if (dest != creep.pos.roomName)
        {
            // code to travel to destination room

            if (canMove && creep.fatigue == 0)
            {
                const destRoom = new RoomPosition(25, 25, dest);
                creep.moveTo(destRoom, { reusePath: 50, range: 24 });
            }

            if (canHeal)
            {
                if (creep.hits < creep.hitsMax)
                {
                    creep.heal(creep);
                }
                else if (roomWounded[creep.pos.roomName] &&
                         roomWounded[creep.pos.roomName].length > 0)
                {
                    creep.healClosest(roomWounded[creep.pos.roomName]);
                }
            }
        }
        else
        {
            // code at destination room

            if (!roomTargets[dest])
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

                roomTargets[dest] = targets;
                roomWounded[dest] = wounded;
            }

            const distanceToCenter = creep.pos.getRangeTo(25, 25);

            let targets = _.filter(
                roomTargets[dest],
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
                if (canAttack)
                {
                    const rangeToTarget = creep.pos.getRangeTo(target);

                    if (rangeToTarget <= 3)
                    {
                        // come a little bit closer
                        if (rangeToTarget > 2)
                        {
                            if (canMove && creep.fatigue == 0)
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
                        if (mass)
                        {
                            const rc = creep.rangedMassAttack();
                            canHealRanged = canHealRanged && rc != OK;
                        }
                        else
                        {
                            const rc = creep.rangedAttack(target);
                            canHealRanged = canHealRanged && rc != OK;
                        }
                    }
                    else
                    {
                        if (canMove && creep.fatigue == 0)
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
                    roomBored[dest] = true;
                }

                // move closer to center
                if (canMove && !creep.pos.inRangeTo(25, 25, 15))
                {
                    creep.moveTo(25, 25);
                }
            } // end of if no target

            if (canHeal || canHealRanged)
            {
                if (canHeal && creep.hits < creep.hitsMax)
                {
                    creep.heal(creep);
                }
                else
                {
                    if (canHealRanged)
                    {
                        creep.healClosest(roomWounded[dest]);
                    }
                    else
                    {
                        creep.healAdjacent(roomWounded[dest]);
                    }
                }
            }
        } // end of else in which room
    } // end of loop for all creeps

    if (Memory.strelok)
    {
        let spawns = _.filter(Game.spawns, function(spawn) { return !spawn.spawning });

        for (const flagName in Game.flags)
        {
            if (spawns.length == 0)
            {
                break; // from flag loop
            }

            if (!flagName.startsWith('strelok'))
            {
                continue;
            }

            let flag = Game.flags[flagName];

            const want = flag.getValue();

            if (want < 1)
            {
                flag.remove();
                continue;
            }

            const bored = (flag.room.controller && flag.room.controller.my) ? false : (roomBored[flag.pos.roomName] || false);

            // automatically stop trashing low threat rooms
            if (want == 1 && bored)
            {
                flag.remove();
                continue;
            }

            const has = roomCount[flag.pos.roomName] || 0;

            if (has < want)
            {
                flag.setSecondaryColor(COLOR_GREY);
            }
            else
            {
                flag.setSecondaryColor(COLOR_WHITE);
            }

            let delta = want - has;
            for (let i = 0; i < spawns.length && delta > 0;)
            {
                let spawn = spawns[i];

                const creepName = flagName + '_' + Game.time + '_' + delta;
                const creepArgs = {
                    memory:
                    {
                        dest: flag.room.name
                    },

                    directions:
                    [
                        TOP, TOP_RIGHT, RIGHT, BOTTOM_RIGHT,
                        BOTTOM, BOTTOM_LEFT, LEFT, TOP_LEFT
                    ]
                };
                const elvl = spawn.room.memory.elvl;

                let rc = undefined;

                if (elvl < 1)
                {
                    rc = spawn.spawnCreep(
                        [ MOVE, RANGED_ATTACK ],
                        creepName,
                        creepArgs
                    );
                }
                else if (elvl <= 3)
                {
                    rc = spawn.spawnCreep(
                        [ MOVE, MOVE, RANGED_ATTACK, HEAL ],
                        creepName,
                        creepArgs
                    );
                }
                else
                {
                    rc = spawn.spawnCreep(
                        [ MOVE, MOVE, MOVE, MOVE, MOVE, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, HEAL ],
                        creepName,
                        creepArgs
                    );
                }

                if (rc == OK)
                {
                    --delta;
                    spawns.splice(i, 1);
                }
                else
                {
                    ++i;
                }
            } // end of loop for all remaining spawns
        } // end of loop for all flags
    } // end of if strelok
};

module.exports = strelok;
