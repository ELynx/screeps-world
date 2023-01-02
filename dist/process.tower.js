'use strict';

var Process = require('process.template');

var towerProcess = new Process('tower');

towerProcess.work = function(room)
{
    this.debugHeader(room);

    const towers = room.find(FIND_MY_STRUCTURES,
        {
            filter: function(structure)
            {
                return structure.structureType == STRUCTURE_TOWER && structure.isActiveSimple();
            }
        }
    );

    if (towers.length == 0)
    {
        return;
    }

    const hostileCreeps = room.getHostileCreeps();
    const friendlyCreeps = room.getMyCreeps();

    const damagedCreeps = _.filter(
        friendlyCreeps,
        function(creep)
        {
            return creep.hits < creep.hitsMax;
        }
    );

    if (hostileCreeps.length > 0 || damagedCreeps.length > 0)
    {
        for (let i = 0; i < towers.length; ++i)
        {
            const closestHostile = towers[i].pos.findClosestByRange(hostileCreeps);
            if(closestHostile)
            {
                var rc = towers[i].attack(closestHostile);
                if (rc == OK) continue;
            }

            const damagedCreep = towers[i].pos.findClosestByRange(damagedCreeps);
            if (damagedCreep)
            {
                towers[i].heal(damagedCreep);
            }
        }
    }
};

towerProcess.register();

module.exports = towerProcess;
