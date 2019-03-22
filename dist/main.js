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

        // arbitrary scope
        {
            // just activate towers
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
        // end of arbitrary scope

        // >>
    }

    //});

    manualStrelok();
    manualReserve();

    //console.log('Used ' + Game.cpu.getUsed());
}
