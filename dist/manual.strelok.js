'use strict';

var strelok = function()
{
    let creeps = _.filter(Game.creeps, function(creep) { return creep.name.startsWith('strelok'); });
    let roomCount = { };

    for (let i = 0; i < creeps.length; ++i)
    {
        let creep  = creeps[i];

        const destRoom = new RoomPosition(25, 25, creep.memory.dest);

        // count how many creeps are already going there
        let now = roomCount[creep.memory.dest] || 0;
        +now;
        roomCount[creep.memory.dest] = now;

        if (creep.pos.roomName != destRoom.roomName)
        {
            if (creep.fatigue == 0)
            {
                // STRATEGY cache path roughly for the room, and just find a spot there
                creep.moveTo(destRoom, { reusePath: 50, range: 24 });
            }
        }
        else
        {
            // first wipe spawn
            let targets = creep.room.find(
                    FIND_HOSTILE_SPAWNS,
                    {
                        filter: function(structure)
                        {
                            // for SourceKeeper
                            return structure.hits;
                        }
                    }
                );

            const attackSpawn = targets.length > 0;

            // next wipe creeps and 'killable' buildings
            const creeps = creep.room.find(FIND_HOSTILE_CREEPS);
            const structs = creep.room.find(
                FIND_HOSTILE_STRUCTURES,
                {
                    filter: function(structure)
                    {
                        return structure.hits && structure.hitsMax < 10000;
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

            const target =  attackSpawn ? targets[0] : creep.pos.findClosestByRange(targets);

            if (target)
            {
                if (creep.pos.inRangeTo(target, 3))
                {
                    // come a little bit closer
                    if (!creep.pos.isNearTo(target))
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
                        creep.rangedMassAttack();
                    }
                    else
                    {
                        creep.rangedAttack(target);
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
        }
    }

    if (Memory.strelok && Memory.handspawn)
    {
        const spawn = Game.getObjectById(Memory.handspawn);

        if (spawn && !spawn.spawning)
        {
            let destRoom = undefined;

            for (const flagName in Game.flags)
            {
                if (!flagName.startsWith('strelok'))
                {
                    continue;
                }

                let flag = Game.flags[flagName];
                
                let count = 3; // red, for brevity

                if (flag.color == COLOR_YELLOW)
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
                    flag.secondaryColor = COLOR_RED;
                    destRoom = flag.pos.roomName;
                }
                else
                {
                    flag.secondaryColor = COLOR_WHITE;
                }
            }
            
            spawn.spawnCreep(
                [
                    RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                    MOVE,          MOVE,          MOVE,          MOVE,          MOVE
                ],
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

};

module.exports = strelok;
