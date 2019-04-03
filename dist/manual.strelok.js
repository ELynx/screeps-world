'use strict';

var strelok = function()
{
    let creeps = _.filter(Game.creeps, function(creep) { return creep.name.startsWith('strelok'); });
    
    let roomCount   = { };
    let roomTargets = { };
    let roomSpawn   = { };
    let roomWounded = { };
    let xtra = [];

    for (let i = 0; i < creeps.length; ++i)
    {
        let creep  = creeps[i];

        // if hit start a war immediately
        if (creep.hits < creep.hitsMax && !creep.memory.war)
        {
            creep.memory.dest = creep.pos.roomName;
            creep.memory.war = true;
        }

        const dest = creep.memory.dest;

        // count how many creeps are already going there
        let now = roomCount[dest] || 0;
        ++now;
        roomCount[dest] = now;

        if (now > 6)
        {
            xtra.push(creep);
        }
        
        if (creep.pos.x == 0)
        {
            creep.move(RIGHT);
        }
        else if (creep.pos.y == 0)
        {
            creep.move(BOTTOM);
        }
        else if (creep.pos.x == 49)
        {
            creep.move(LEFT);
        }
        else if (creep.pos.y == 49)
        {
            creep.move(TOP);
        }
        
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

                const destToCenter = creep.pos.getRangeTo(25, 25);
                
                roomTargets[dest] = _.filter(
                    targets,
                    function(smth)
                    {
                        if (smth.structureType == STRUCTURE_STORAGE)
                        {
                            return targets.length == 1;
                        }
                        
                        if (smth.structureType == STRUCTURE_RAMPART)
                        {
                            // only forward
                            return smth.pos.getRangeTo(25, 25) < destToCenter - 2;
                        }
                        
                        return true;
                    }
                );
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

        let xtraRoom = undefined;
        
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
                
                let count = 3; // red, for brevity

                if (flag.color == COLOR_RED)
                {
                    xtraRoom = flag.pos.roomName;
                }
                if (flag.color == COLOR_PURPLE)
                {
                    count = 9;
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
                
                if (count > 0)
                {
                    flag.setColor(flag.color, COLOR_RED);
                }
                else
                {
                    flag.setColor(flag.color, COLOR_WHITE);
                }

                if (count > 0)
                {
                    destRoom = flag.pos.roomName;
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
        
        if (xtra.length >= 3 && xtraRoom)
        {
            for (let i = 0; i < xtra.length; ++i)
            {
                xtra[i].memory.dest = xtraRoom;
            }
        }
    }

};

module.exports = strelok;
