'use strict';

var memoryManager = require('routine.memory');
var roomActor = require('actor.room');
var strelok = require('manual.strelok');

//const profiler = require('screeps-profiler');
//profiler.enable();

module.exports.loop = function()
{
    //console.log('Limit ' + Game.cpu.limit);
    //console.log('Tick limit ' + Game.cpu.tickLimit);
    //console.log('Bucket ' + Game.cpu.bucket);

    //profiler.wrap(function() {

    memoryManager.cleanup();

    for(const name in Game.rooms)
    {
        roomActor.act(Game.rooms[name]);

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
    }

    //});

    strelok();

    // temporary code, break neighbour
    // <<
    {
        const watchPoint = new RoomPosition(27, 6, 'E39N1');
        const dropPoint = Game.getObjectById('5bbcaf309099fc012e63a4c5').pos;
        const ctrl = Game.getObjectById('5bbcaf439099fc012e63a652');

        if (ctrl)
        {
            if (ctrl.safeMode)
            {
                Game.notify('Safe mode on');
                delete Memory.pestering;
            }
            else if (ctrl.level == 0)
            {
                Game.notify('Done');
                delete Memory.pestering;
            }
        }

        var lad = Game.creeps['lad'];
        if (lad)
        {
            if (lad.hits < lad.hitsMax)
            {
                Memory.pestering = false;
            }

            var goHome = true;

            if (ctrl)
            {
                if (!ctrl.upgradeBlocked)
                {
                    goHome = false;
                }
            }

            if (goHome)
            {
                if (lad.pos.inRangeTo(dropPoint, 2))
                {
                    lad.suicide();
                }
                else
                {
                    lad.moveTo(dropPoint, { maxRooms: 2, range: 2 });
                }
            }
            else
            {
                if (lad.pos.isNearTo(ctrl))
                {
                    lad.attackController(ctrl);
                }
                else
                {
                    lad.moveTo(ctrl, { maxRooms: 2 });
                }
            }
        }
        else
        {
            if (Memory.pestering)
            {
                if (ctrl && ctrl.level > 0 && !ctrl.upgradeBlocked)
                {
                    Game.getObjectById('5c8f93046ce2ec3bb9d19a9e').spawnCreep([MOVE, CLAIM], 'lad');
                }
            }
        }

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
                    chum.moveTo(dropPoint, { maxRooms: 2, range: 2 });
                }
            }
            else
            {
                if (chum.pos.roomName != watchPoint.roomName)
                {
                    chum.moveTo(watchPoint, { maxRooms: 2 });
                }
                else
                {
                    var suckers = chum.room.find(FIND_HOSTILE_CREEPS);
                    if (suckers.length == 0)
                    {
                        suckers = chum.room.find(FIND_HOSTILE_SPAWNS);
                    }

                    if (suckers.length > 0)
                    {
                        if (chum.pos.inRangeTo(suckers[0], 3))
                        {
                            chum.rangedAttack(suckers[0]);
                        }
                        else
                        {
                            chum.moveTo(suckers[0], { maxRooms: 1 });
                        }
                    }
                    else
                    {
                        if (!chum.pos.isEqualTo(watchPoint))
                        {
                            chum.moveTo(watchPoint, { maxRooms: 2 });
                        }
                    }
                }
            }
        }
        else
        {
            if (Memory.pestering)
            {
                const wroom = Game.rooms[watchPoint.roomName];

                if (wroom)
                {
                    const spwns = wroom.find(FIND_HOSTILE_SPAWNS);

                    if (spwns.length > 0)
                    {
                        Game.getObjectById('5c8f93046ce2ec3bb9d19a9e').spawnCreep([MOVE, RANGED_ATTACK, RANGED_ATTACK], 'chum');
                    }
                }
            }
        }

        const pestNames = ['pest'];

        for (var i = 0; i < pestNames.length; ++i)
        {
            var pest = Game.creeps[pestNames[i]];

            if (!pest)
            {
                if (Memory.pestering)
                {
                    Game.getObjectById('5c8f93046ce2ec3bb9d19a9e').spawnCreep([MOVE], pestNames[i]);
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

            if (pest.ticksToLive > 100)
            {
                if (pest.pos.roomName == 'E38N1')
                {
                    pest.moveTo(49, 19, 'E38N1', { maxRooms: 1 });
                }
                else
                {
                    if (!pest.pos.isNearTo(watchPoint))
                    {
                        pest.moveTo(watchPoint, { maxRooms: 1, range: 1 });
                    }
                }
            }
            else
            {
                if (pest.pos.roomName == 'E39N1')
                {
                    pest.moveTo(0, 19, 'E39N1', { maxRooms: 1 });
                }
                else
                {
                    if (pest.pos.inRangeTo(dropPoint, 2))
                    {
                        pest.suicide();
                    }
                    else
                    {
                        pest.moveTo(dropPoint, { maxRooms: 1, range: 2 });
                    }
                }
            }
        }
    }
    // >>

    //console.log('Used ' + Game.cpu.getUsed());
}
