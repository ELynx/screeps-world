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

        // temporary code, break neighbour controller
        const dropPoint = Game.getObjectById('5bbcaf309099fc012e63a4c5').pos;
        
        // <<
        var lad = Game.creeps['lad'];
        if (lad)
        {
            if (lad.hits < lad.hitsMax)
            {
                Memory.pestering = false;
            }

            const ctrl = Game.getObjectById('5bbcaf439099fc012e63a652');

            if (ctrl)
            {
                if (ctrl.safeMode)
                {
                    Memory.pestering = false;
                }

                if (ctrl.upgradeBlocked)
                {
                    if (lad.pos.inRangeTo(dropPoint, 2))
                    {
                        lad.suicide();
                    }
                    else
                    {
                        lad.moveTo(dropPoint, { maxRooms: 1, plainCost: 1, range: 2 });
                    }
                }
                else
                {
                    if (lad.pos.isNearTo(ctrl))
                    {
                        if (ctrl.level == 0)
                        {
                            lad.say('MINE');
                            lad.claimController(ctrl);
                        }
                        else if (Game.gcl.level > 1)
                        {
                            lad.say('Do damage');
                            lad.attackController(ctrl);
                        }
                        else if (ctrl.level > 2)
                        {
                            lad.say('Do damage');
                            lad.attackController(ctrl);
                        }
                        else
                        {
                            lad.say('-whistle-');
                        }
                    }
                    else
                    {
                        lad.say('Incoming');
                        lad.moveTo(ctrl, { maxRooms: 2 });
                    }
                }
            }
        }
        else
        {
            const ctrl = Game.getObjectById('5bbcaf439099fc012e63a652');

            if (ctrl && !ctrl.upgradeBlocked && ctrl.level > 2)
            {
                if (Memory.pestering)
                {
                    Game.getObjectById('5c8f93046ce2ec3bb9d19a9e').spawnCreep([MOVE, CLAIM], 'lad');
                }
            }
        }
        // >>

        // temporary code, attack neighbour
        // <<
        var chum = Game.creeps['chum'];
        if (chum)
        {
            if (chum.hits < chum.hitsMax)
            {
                Memory.pestering = false;
            }

            if (chum.ticksToLive < 100)
            {
                if (chum.pos.inRangeTo(dropPoint, 2))
                {
                    chum.suicide();
                }
                else
                {
                    chum.moveTo(dropPoint, { maxRooms: 1, plainCost: 1, range: 2 });
                }
            }
            else
            {
                const chumStand = new RoomPosition(25, 8, 'E39N1');

                if (!chum.pos.isEqualTo(chumStand))
                {
                    chum.say('Incoming');
                    chum.moveTo(chumStand, { maxRooms: 2 });
                }
                else
                {
                    if (chum.room.controller.level > 2)
                    {
                        const suckers = chumStand.findInRange(FIND_HOSTILE_CREEPS, 3, { filter: function(sucker) { return sucker.hits > 20; } });

                        if (suckers.length > 0)
                        {
                            chum.say('Ha-ha');
                            chum.rangedAttack(suckers[0]);
                        }
                        else
                        {
                            chum.say('Suffer');
                        }
                    }
                    else
                    {
                        chum.say('Live for now');
                    }
                }
            }
        }
        else
        {
            if (Memory.pestering)
            {
                Game.getObjectById('5c8f93046ce2ec3bb9d19a9e').spawnCreep([MOVE, RANGED_ATTACK, RANGED_ATTACK], 'chum');
            }
        }
        // >>

        // temporary code, steal energy from neighbour
        // <<
        const pestNames = ['pest', 'pester'];
        var letGrow = false;

        for (var i = 0; i < pestNames.length; ++i)
        {
            var pest = Game.creeps[pestNames[i]];

            if (!pest)
            {
                if (Memory.pestering)
                {
                    Game.getObjectById('5c8f93046ce2ec3bb9d19a9e').spawnCreep([CARRY, CARRY, CARRY, MOVE, MOVE, MOVE], pestNames[i]);
                }

                continue;
            }

            if (pest.spawning)
            {
                continue;
            }

            if (pest.hits < pest.hitsMax)
            {
                Memory.pestering = false;
            }

            if (pest.carry.energy < pest.carryCapacity && pest.ticksToLive > 100)
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
                            if (!letGrow)
                            {
                                const stillWorking = pest.room.find(FIND_HOSTILE_CREEPS, { filter: function(sucker) { return sucker.hits > 20; } });
                                letGrow = stillWorking.length < 2;
                            }

                            if (letGrow)
                            {
                                pest.say('Breed some');
                            }
                            else
                            {
                                pest.say('Slurp');
                                pest.withdraw(spawn, RESOURCE_ENERGY);
                            }
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
                        if (pest.pos.inRangeTo(dropPoint, 2))
                        {
                            pest.drop(RESOURCE_ENERGY);

                            if (pest.ticksToLive < 100)
                            {
                                pest.suicide();
                            }
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
