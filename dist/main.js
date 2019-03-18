'use strict';

var memoryManager = require('routine.memory');
var roomActor = require('actor.room');

////const profiler = require('screeps-profiler');
////profiler.enable();

module.exports.loop = function ()
{
    //console.log('Limit ' + Game.cpu.limit);
    //console.log('Tick limit before ' + Game.cpu.tickLimit);
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
    }

    //console.log('Tick limit after ' + Game.cpu.tickLimit);
}
