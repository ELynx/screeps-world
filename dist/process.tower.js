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

    const hostileCreeps = room.find(FIND_HOSTILE_CREEPS);

    if (hostileCreeps.length > 0)
    {
        for (let i = 0; i < towers.length; ++i)
        {
            const closestHostile = towers[i].pos.findClosestByRange(hostileCreeps);
            if(closestHostile)
            {
                towers[i].attack(closestHostile);
            }
        }       
    }

    const friendlyCreeps = room.find(FIND_MY_CREEPS);
    const damagedCreeps = _.filter(
        friendlyCreeps,
        function(creep)
        {
            return creep.hits < creep.hitsMax;
        }
    );

    if (damagedCreeps.length > 0)
    {
        for (let i = 0; i < towers.length; ++i)
        {
            const closestDamaged = towers[i].pos.findClosestByRange(damagedCreeps);
            if(closestDamaged)
            {
                towers[i].heal(closestDamaged);
            }
        }   
    }
};

towerProcess.register();

module.exports = towerProcess;
