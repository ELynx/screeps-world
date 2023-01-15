'use strict';

var Tasked = require('tasked.template');

var plunder = new Tasked('plunder');

plunder.prepare = function()
{
};

plunder.creepPrepare = function(creep)
{
};

plunder.creepAtDestination = function(creep)
{
    this._coastToHalt(creep);
};

plunder.creepRoomTravel = function(creep)
{
    this._creepRoomTravel(creep);
};

plunder.flagPrepare = function(flag)
{
    return this.FLAG_IGNORE;
};

plunder.makeBody = function(spawn)
{
    const elvl = spawn.room.memory.elvl;

    if (elvl <= 1)
    {
        // 100  50     50
        return [CARRY, MOVE];
    }

    // 300  50     50     50     50    50    50
    return [CARRY, CARRY, CARRY, MOVE, MOVE, MOVE]
};

plunder.register();

module.exports = plunder;
