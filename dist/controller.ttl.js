'use strict';

var globals = require('globals');
var Controller = require('controller.template');

var ttlController = new Controller('ttl');

const HitsTreshold = 99;
const Ttl = 100;

ttlController.actRange = 1;

ttlController.enough = function(room)
{
    const st = this._findStaticTargets(room);
    return st.length;
};

ttlController.act = function(spawn, creep)
{
    var recycle = false;
    var countRecycle = false;
    var renew = false;
    var rc = false;

    const strength = globals.roomEnergyToStrength(spawn.room.memory.elvl);

    // one-shot
    // <<
    if (creep.memory.btyp == 1 && !creep.memory.frsh)
    {
        recycle = true;
    } else
    // >>
    // if not needed anymore
    if (spawn.room.memory.ccnt && spawn.room.memory.ccnt[creep.memory.btyp] < 0)
    {
        recycle = true;
        countRecycle = true;
    }
    // if from previous level
    else if (creep.memory.levl < strength)
    {
        recycle = true;
    }
    // TODO mix with healing
    // if has disabled body parts
    else if (creep.hitsMax - creep.hits > HitsTreshold)
    {
        recycle = true;
    }
    // renewal part
    // if controller started to spawn at the same time wait for it
    else if (spawn.spawning)
    {
        if (creep.ticksToLive <= spawn.spawning.remainingTime)
        {
            recycle = true;
        }
        else
        {
            rc = true;
        }
    }
    else
    {
        renew = true;
    }

    // donate while here
    if (spawn.energy < spawn.energyCapacity && creep.carry.energy > 0)
    {
        creep.transfer(spawn, RESOURCE_ENERGY);
    }

    if (recycle)
    {
        rc = spawn.recycleCreep(creep) == OK;

        if (rc && countRecycle)
        {
            ++spawn.room.memory.ccnt[creep.memory.btyp];
        }
    }

    if (renew)
    {
        rc = spawn.renewCreep(creep) == OK;
    }

    return rc;
};

ttlController.staticTargets = function(room)
{
    return room.find(FIND_MY_SPAWNS,
        {
            filter: function(spawn)
            {
                return spawn.isActive() && !spawn.spawning;
            }
        }
    );
};

ttlController.filterCreep = function(creep)
{
    // TODO mix with healing
    // if has disabled body parts
    if (creep.hitsMax - creep.hits > HitsTreshold)
    {
        return true;
    }

    return creep.ticksToLive <= Ttl;
};

ttlController.register();

module.exports = ttlController;
