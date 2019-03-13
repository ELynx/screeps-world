'use strict';

var globals = require('globals');

var memoryManager = require('routine.memory');

var roomActor = require('actor.room');

////const profiler = require('screeps-profiler');
////profiler.enable();

module.exports.loop = function ()
{
    ////profiler.wrap(function() {

    globals.debugReset();

    memoryManager.cleanup();

    roomActor.act(Game.rooms['sim']);

    ////});

    // temporary, just activate tower(s)
    // <<
    {
        const towers = Game.rooms['sim'].find(FIND_MY_STRUCTURES,
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
