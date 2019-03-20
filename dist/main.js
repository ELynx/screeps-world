'use strict';

var memoryManager = require('routine.memory');
var roomActor = require('actor.room');

////const profiler = require('screeps-profiler');
////profiler.enable();

module.exports.loop = function ()
{
    //console.log('Limit ' + Game.cpu.limit);
    //console.log('Tick limit ' + Game.cpu.tickLimit);
    //console.log('Bucket ' + Game.cpu.bucket);

    ////profiler.wrap(function() {

    memoryManager.cleanup();

    for(const name in Game.rooms)
    {
        roomActor.act(Game.rooms[name]);

        ////});

        // temporary, just activate tower(s)
        // <<
        {
            const towers = Game.rooms[name].find(FIND_MY_STRUCTURES,
                {
                    filter: function(structure)
                    {
                        return structure.structureType == STRUCTURE_TOWER;
                    }
                }
            );

            for (var i = 0; i < towers.length; ++i)
            {
                const closestHostile = towers[i].pos.findClosestByRange(FIND_HOSTILE_CREEPS);
                if(closestHostile)
                {
                    towers[i].attack(closestHostile);
                    continue;
                }

                const damagedCreep = towers[i].pos.findClosestByRange(FIND_MY_CREEPS,
                    {
                        filter: function(creep)
                        {
                            return creep.hits < creep.hitsMax;
                        }
                    }
                );

                if (damagedCreep)
                {
                    towers[i].heal(damagedCreep);
                    continue;
                }
            }
        }
        // >>

        // temporary code, attack neighbour
        // <<
        var chum = Game.creeps['chum'];
        if (chum)
        {
            const chumStand = new RoomPosition(25, 8, 'E39N1');

            if (!chum.pos.isEqualTo(chumStand))
            {
                chum.say('Incoming');
                chum.moveTo(chumStand, { maxRooms: 2 });
            }
            else
            {
                if (chum.room.controller.level > 1)
                {
                    const suckers = chumStand.findInRange(FIND_HOSTILE_CREEPS, 3, { filter: function(sucker) { return sucker.hits > 50; } });

                    if (suckers.length > 0)
                    {
                        chum.say('Ha-ha');
                        chum.rangedAttack(suckers[0]);
                    }
                }
                else
                {
                    chum.say('Live for now');
                }

            }
        }
        else
        {
            Game.getObjectById('5c8f93046ce2ec3bb9d19a9e').spawnCreep([MOVE, RANGED_ATTACK], 'chum');
        }
        // >>

        // temporary code, steal energy from neighbour
        // <<
        const pestNames = ['pest', 'pester'];

        for (var i = 0; i < pestNames.length; ++i)
        {
            var pest = Game.creeps[pestNames[i]];

            if (!pest)
            {
                Game.getObjectById('5c8f93046ce2ec3bb9d19a9e').spawnCreep([CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, WORK, MOVE, MOVE, MOVE, MOVE], pestNames[i]);
                continue;
            }

            if (pest.spawning)
            {
                continue;
            }

            if (pest.carry.energy < pest.carryCapacity)
            {
                if (pest.pos.roomName == 'E38N1')
                {
                    pest.moveTo(49, 19, 'E38N1', { maxRooms: 1 });
                }
                else
                {
                    const tbb = undefined; // Game.getObjectById('');
                    if (tbb)
                    {
                        pest.say('SMASH!');
                        if (pest.pos.isNearTo(tbb))
                        {
                            pest.dismantle(tbb);
                        }
                        else
                        {
                            pest.moveTo(tbb, { maxRooms: 1, range: 1});
                        }
                    }
                    else
                    {
                        const spawn = Game.getObjectById('5c8d3f57360c03411ed406f8');
                        if (pest.pos.isNearTo(spawn))
                        {
                            pest.say('Slurp');
                            pest.withdraw(spawn, RESOURCE_ENERGY);
                        }
                        else
                        {
                            pest.say('Hello');
                            pest.moveTo(spawn, { maxRooms: 1, range: 1 });
                        }
                    }
                }
            }
            else
            {
                if (pest.fatigue == 0)
                {
                    if (pest.pos.roomName == 'E39N1')
                    {
                        pest.say('Goodbye');
                        pest.moveTo(0, 19, 'E39N1', { maxRooms: 1 });
                    }
                    else
                    {
                        const dropPoint = Game.getObjectById('5c8f93046ce2ec3bb9d19a9e').pos;

                        if (pest.pos.inRangeTo(dropPoint, 2))
                        {
                            pest.drop(RESOURCE_ENERGY);
                        }
                        else
                        {
                            pest.moveTo(dropPoint, { maxRooms: 1, plainCost: 2, range: 2 });
                        }
                    }
                }
            }
        }
        // >>
    }

    //console.log('Used ' + Game.cpu.getUsed());
}
