'use strict';

var strelok = function()
{
    let creeps = _.filter(Game.creeps, function(creep) { return creep.name.startsWith('strelok'); });

    let roomCount   = { };
    let roomTargets = { };
    let roomWounded = { };

    for (let i = 0; i < creeps.length; ++i)
    {
        let creep  = creeps[i];

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
            if (creep.fatigue == 0)
            {
                const destRoom = new RoomPosition(25, 25, dest);
                const destRange = 24;

                if (!creep.pos.inRangeTo(destRoom, destRange))
                {
                    creep.moveTo(destRoom, { reusePath: 50, range: destRange });
                }
            }

            if (creep.hits < creep.hitsMax)
            {
                creep.heal(creep);
            }
            else if (roomWounded[creep.pos.roomName] &&
                     roomWounded[creep.pos.roomName].length > 0)
            {
                const toHeal = creep.pos.getClosestByRange(roomWounded[creep.pos.roomName]);
                if (toHeal)
                {
                    if (creep.pos.isNearTo(toHeal))
                    {
                        creep.heal(toHeal);
                    }
                    else
                    {
                        creep.rangedHeal(toHeal);
                    }
                }
            }
        }
        else
        {
            // TODO right after entrance

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
                        return hostile.pos.getRangeTo(25, 25) < distanceToCenter + 1;
                    }

                    return true;
                }
            );

            let canHeal = true;
            
            const target = creep.pos.findClosestByRange(targets);

            if (target && creep.getActiveBodyparts(RANGED_ATTACK) > 0)
            {
                if (creep.pos.inRangeTo(target, 3))
                {
                    // come a little bit closer
                    if (creep.pos.getRangeTo(target) > 2)
                    {
                        creep.move(creep.pos.getDirectionTo(target));
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
                        canHeal = creep.rangedMassAttack() != OK;
                    }
                    else
                    {
                        canHeal = creep.rangedAttack(target) != OK;
                    }
                }
                else
                {
                    if (creep.fatigue == 0)
                    {
                        // STRATEGY follow creep tightly, default to building
                        const reuse = target.structureType ? 5 : 0;

                        creep.moveTo(target, { reusePath: reuse });
                    }
                }
            }
            else
            {
                if (target)
                {
                    creep.moveTo(target, { resuePath: 0, flee: true, range: 4 } );
                }
            }

            if (canHeal)
            {
                if (creep.hits < creep.hitsMax)
                {
                    creep.heal(creep);
                }
                else
                {
                    const toHeal = creep.pos.findClosestByRange(roomWounded[dest]);
                    if (toHeal)
                    {
                        if (creep.pos.isNearTo(toHeal))
                        {
                            creep.heal(toHeal);
                        }
                        else
                        {
                            creep.rangedHeal(toHeal);
                        }
                    }
                }
            }
        }
    }

    if (Memory.strelok)
    {
        const spawns = _.filter(Game.spawns, function(spawn) { return !spawn.spawning; });

        for (let i = 0; i < spawns.length; ++i)
        {
            let spawn = spawns[i];
            
            let destRoom = undefined;

            for (const flagName in Game.flags)
            {
                if (!flagName.startsWith('strelok'))
                {
                    continue;
                }

                let flag = Game.flags[flagName];
                
                let count = flag.getValue();

                count = count - (roomCount[flag.pos.roomName] || 0);

                if (count > 0)
                {
                    flag.setSecondaryColor(COLOR_RED);
                }
                else
                {
                    flag.setSecondaryColor(COLOR_WHITE);
                }

                if (count > 0)
                {
                    destRoom = flag.pos.roomName;
                    break;
                }
            }

            if (destRoom)
            {
                const body = Math.random() < 0.85 ?
                    [
                        MOVE,          MOVE,          MOVE,          MOVE,          MOVE,
                        RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, HEAL
                    ]
                    :
                    [
                        MOVE,          MOVE,          MOVE,
                        RANGED_ATTACK, RANGED_ATTACK, HEAL
                    ];

                let rc = spawn.spawnCreep(
                    body,
                    'strelok_' + Game.time,
                    {
                        memory:
                        {
                            dest: destRoom
                        }
                    }
                );
            }
        }
    }
};

module.exports = strelok;
