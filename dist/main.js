'use strict';

var memoryManager = require('routine.memory');
var roomActor = require('actor.room');
var manualStrelok = require('manual.strelok');
var manualReserve = require('manual.reserve');

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
        const room = Game.rooms[name];

        roomActor.act(room);

        // temporary defences
        // <<

        var hostileCreeps = room.find(FIND_HOSTILE_CREEPS);
        var damagedCreeps = room.find(
            FIND_MY_CREEPS,
            {
                filter: function(creep)
                {
                    return creep.hits < creep.hitsMax;
                }
            }
        );

        if (hostileCreeps.length > 0)
        {
            const ctrl = room.controller;

            if (ctrl && ctrl.my)
            {
                if (!ctrl.safeMode &&
                    !ctrl.safeModeCooldown &&
                    !ctrl.upgradeBlocked &&
                     ctrl.safeModeAvailable > 0)
                {
                    for (const flagName in Game.flags)
                    {
                        if (!flagName.startsWith('fence'))
                        {
                            continue;
                        }

                        const flag = Game.flags[flagName];

                        if (flag.pos.roomName != name)
                        {
                            continue;
                        }

                        var range = 3; // red, for brevity

                        if (flag.color == COLOR_YELLOW)
                        {
                            range = 2;
                        }
                        else if (flag.color == COLOR_GREEN)
                        {
                            range = 1;
                        }

                        const trigger = flag.pos.findInRange(hostileCreeps, range);
                        if (trigger.length > 0)
                        {
                            const rc = ctrl.activateSafeMode();

                            const notification = 'Room ' + name + ' requested safeMode [' + rc + ']';

                            Game.notify(notification);
                            console.log(notification);

                            break;
                        }
                    }
                }
            }
        }

        if (hostileCreeps.length > 0 || damagedCreeps.length > 0)
        {
            // just activate towers
            const towers = room.find(FIND_MY_STRUCTURES,
                {
                    filter: function(structure)
                    {
                        return structure.structureType == STRUCTURE_TOWER;
                    }
                }
            );

            for (var i = 0; i < towers.length; ++i)
            {
                const closestHostile = towers[i].pos.findClosestByRange(hostileCreeps);
                if(closestHostile)
                {
                    towers[i].attack(closestHostile);
                    continue;
                }

                const damagedCreep = towers[i].pos.findClosestByRange(damagedCreeps);

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

    manualStrelok();
    manualReserve();

    //console.log('Used ' + Game.cpu.getUsed());
}
