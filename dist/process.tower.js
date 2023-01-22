'use strict';

var Process = require('process.template');

var towerProcess = new Process('tower');

towerProcess.work = function(room)
{
    this.debugHeader(room);

    const towers = room.find(
        FIND_STRUCTURES,
        {
            filter: function(structure)
            {
                return structure.structureType == STRUCTURE_TOWER && structure.isActiveSimple();
            }
        }
    );
    if (towers.length == 0) return;

    const creeps = room.find(FIND_CREEPS);

    const hostileCreeps = _.filter(
        creeps,
        function(creep)
        {
            return creep.hostile;
        }
    );

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

        return;
    }

    const damagedCreeps = _.filter(
        creeps,
        function(creep)
        {
            // callous
            if (creep.memory && creep.memory.selfCanHeal) return false;

            return creep.myOrAlly() && (creep.hits < creep.hitsMax);
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
