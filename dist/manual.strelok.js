'use strict';

var strelok = function()
{
    let creeps = _.filter(Game.creeps, function(creep) { return creep.name.startsWith('strelok'); });
    
    let roomCount   = { };
    let roomTargets = { };
    let roomSpawn   = { };
    let roomWounded = { };

    for (let i = 0; i < creeps.length; ++i)
    {
        let creep  = creeps[i];

        // if hit start a war immediately
        if (creep.hits < creep.hitsMax)
        {
            creep.memory.dest = creep.pos.roomName;
        }

        const dest = creep.memory.dest;

        // count how many creeps are already going there
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

            if (roomWounded[creep.pos.roomName] &&
                roomWounded[creep.pos.roomName].length > 0)
            {
                creep.rangedHeal(roomWounded[creep.pos.roomName][0]);
            }
        }
        else
        {
            if (!roomTargets[dest])
            {
                // first wipe spawn
                /*let targets = creep.room.find(
                    FIND_HOSTILE_SPAWNS,
                    {
                        filter: function(structure)
                        {
                            // for SourceKeeper
                            return structure.hits;
                        }
                    }
                );*/
                let targets = [];

                const attackSpawn = targets.length > 0;

                // next wipe creeps and 'killable' buildings
                const creeps = creep.room.find(FIND_HOSTILE_CREEPS);
                const structs = creep.room.find(
                    FIND_HOSTILE_STRUCTURES,
                    {
                        filter: function(structure)
                        {
                            return structure.hits/* && structure.hitsMax < 10000*/;
                        }
                    }
                );

                if (creeps.length > 0)
                {
                    targets = targets.concat(creeps);
                }

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
                roomSpawn[dest]   = attackSpawn;
                roomWounded[dest] = wounded;
            }

            let targets     = roomTargets[dest];
            let attackSpawn = roomSpawn[dest];
            let wounded     = roomWounded[dest];
 
            const target =  attackSpawn ? targets[0] : creep.pos.findClosestByRange(targets);

            let canHeal = true;

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

                    if (target.energy)
                    {
                        creep.withdraw(target, RESOURCE_ENERGY);
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
                    creep.moveTo(target, { resuePath: 0, flee: true } );
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
                    const toHeal = creep.pos.findClosestByRange(wounded);
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

                if (flagName == Memory.lastFlag)
                {
                    continue;
                }

                let flag = Game.flags[flagName];
                
                let count = 3; // red, for brevity

                if (flag.color == COLOR_PURPLE)
                {
                    count = 6;
                }
                else if (flag.color == COLOR_YELLOW)
                {
                    count = 2;
                }
                else if (flag.color == COLOR_GREEN)
                {
                    count = 1;
                }
                
                count = count - (roomCount[flag.pos.roomName] || 0);
                
                // don't bother if several
                if (count > 0)
                {
                    flag.setColor(flag.color, COLOR_RED);
                    destRoom = flag.pos.roomName;
                }
                else
                {
                    flag.setColor(flag.color, COLOR_WHITE);
                }
            }

            if (destRoom)
            {
                const body = Math.random() < 0.95 ?
                    [
                        MOVE,          MOVE,          MOVE,          MOVE,          MOVE,
                        RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, HEAL
                    ]
                    :
                    [
                        RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                        MOVE,          MOVE,          MOVE
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

                if (rc == OK)
                {
                    Memory.lastFlag = flagName;
                }
            }
        }
    }

};

module.exports = strelok;
