'use strict';

var Tasked = require('tasked.template');

var plunder = new Tasked('plunder');

plunder.prepare = function()
{
};

plunder.creepPrepare = function(creep)
{
    this._flagCountCreep(creep);
};

plunder.creepAtDestination = function(creep)
{
    this._coastToHalt(creep);
};

plunder.creepRoomTravel = function(creep)
{
    // keep track of closest owned stuff

    if (creep.room.terminal && creep.room.terminal.my)
        creep.memory.terminal = creep.room.terminal.id;

    if (creep.room.storage  && creep.room.storage.my)
        creep.memory.storage  = creep.room.storage.id;

    this._creepRoomTravel(creep);
};

plunder.flagPrepare = function(flag)
{
    return this._flagCountBasic(flag, 10, 20);
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
