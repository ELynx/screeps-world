'use strict';

var delivery = function()
{
    let creeps = _.filter(Game.creeps, function(creep) { return creep.name.startsWith('delivery'); });

    for (let i = 0; i < creeps.length; ++i)
    {
        let creep = creeps[i];

        if (creep.memory.dest != creep.pos.roomName)
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
        }
        else
        {
            if (creep.pos.roomName == creep.memory.to)
            {
                const flag = Game.flags[creep.memory.flag];
                if (flag)
                {
                    if (!creep.pos.inNearTo(flag))
                    {
                        creep.moveTo(flag);
                    }
                    else
                    {
                        let found = false;

                        const structs = flag.pos.lookFor(LOOK_STRUCTURES);
                        for (let j = 0; j < structs.length && !found; ++j)
                        {
                            const s = structs[j];

                            if (s.energy)
                            {
                                found = creep.withdraw(RESOURCE_ENERGY) == OK;
                            }
                            else if (s.store)
                            {
                                for (const rt in s.store)
                                {
                                    if (s.store[rt] > 0)
                                    {
                                        found = creep.withdraw(rt) == OK;
                                    }

                                    if (found)
                                    {
                                        break;
                                    }
                                }
                            }

                            if (found)
                            {
                                break;
                            }
                        }

                        if (!found)
                        {
                            creep.memory.dest = creep.memory.from;
                        }
                    }
                }
            }
            else
            {
                if (creep.sumCarry() == 0 && creep.ticksToLive > 400)
                {
                    creep.memory.dest = creep.memory.to;
                }
                else
                {
                    let somePos = new RoomPosition(25, 25, creep.pos.roomName);
                    let someDist = 10;
                    
                    const drop = Game.flags['drop'];
                    if (drop)
                    {
                        somePos = drop.pos;
                        someDist = 1;
                    }

                    if (creep.inRangeTo(somePos, someDist))
                    {
                        if (creep.ticksToLive <= 400)
                        {
                            creep.suicide();
                        }
                        else
                        {
                            for(const resourceType in creep.carry)
                            {
                                creep.drop(resourceType);
                            }
                        }
                    }
                }
            }
        }
    }

    if (Memory.delivery && Memory.handspawn)
    {
        let spawn = Game.getObjectById(Memory.handspawn);

        if (spawn && !spawn.spawning)
        {
            var flagCount = { };

            for (var i = 0; i < creeps.length; ++i)
            {
                let count = flagCount[creeps[i].memory.flag] || 0
                ++count;
                flagCount[creeps[i].memory.flag] = count;
            }

            for (const flagName in Game.flags)
            {
                if (!flagName.startsWith('delivery'))
                {
                    continue;
                }

                let flag = Game.flags[flagName];
                let strength = flag.getValue();

                if (!strength)
                {
                    continue;
                }

                const already = flagCount[flag.name] || 0;

                if (already >= strength)
                {
                    continue;
                }
                
                const body = strength > 2 ?
                    [CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE]
                    :
                    [CARRY, MOVE]
                ;

                let rc = spawn.spawnCreep(
                    body,
                    'delivery_' + Game.time,
                    {
                        memory:
                        {
                            dest: flag.pos.roomName,
                            to:   flag.pos.roomName,
                            from: spawn.pos.roomName,
                            flag: flag.name
                        }
                    }
                );
            }
        }
    }
};

module.exports = delivery;
