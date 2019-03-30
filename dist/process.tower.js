'use strict';

var Process = require('process.template');

var towerProcess = new Process('tower');

towerProcess.work = function(room, friendlyCreeps, hostileCreeps)
{
    this.debugHeader(room);

    const damagedCreeps = _.filter(
        friendlyCreeps,
        function(creep)
        {
            return creep.hits < creep.hitsMax;
        }
    );

    if (hostileCreeps.length > 0 || damagedCreeps.length > 0)
    {
        const towers = room.find(FIND_MY_STRUCTURES,
            {
                filter: function(structure)
                {
                    return structure.structureType == STRUCTURE_TOWER && structure.my && structure.isActive();
                }
            }
        );

        for (var i = 0; i < towers.length; ++i)
        {
            const closestHostile = towers[i].pos.findClosestByRange(hostileCreeps);
            if(closestHostile)
            {
                towers[i].attack(closestHostile);
                //continue;
            }

            const damagedCreep = towers[i].pos.findClosestByRange(damagedCreeps);
            if (damagedCreep)
            {
                towers[i].heal(damagedCreep);
                //continue;
            }
        }
    }
};

towerProcess.register();

module.exports = towerProcess;
