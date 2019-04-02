'use strict';

var strelok = function()
{
    var creeps = _.filter(Game.creeps, function(creep) { return creep.name.startsWith('strelok'); });

    for (let i = 0; i < creeps.length; ++i)
    {
        let creep  = creeps[i];

        // go down in flames, fire in the room we are hit in
        const dest = Memory.strelok ? Memory.strelok : creep.pos.roomName;
        const destRoom = new RoomPosition(25, 25, dest);

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
            else
            {
                Memory.strike = undefined;
            }
        }
    }

    if (Memory.strelok && Memory.handspawn && Memory.strike && Memory.strike > 0)
    {
        const spawn = Game.getObjectById(Memory.handspawn);

        if (spawn)
        {
            let rc = spawn.spawnCreep(
                [
                    RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                    MOVE,          MOVE,          MOVE,          MOVE,          MOVE
                ],
                'strelok_' + Game.time
            );
            
            if (rc === OK)
            {
                if (Memory.strike > 1)
                {
                    --Memory.strike;
                }
                else
                {
                    Memory.strike = undefined;
                }
            }
        }
    }

};

module.exports = strelok;
