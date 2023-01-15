'use strict';

var Tasked = require('tasked.template');

var outlast = new Tasked('outlast');

outlast.prepare = function()
{
};

outlast.creepPrepare = function(creep)
{
};

outlast.creepAtDestination = function(creep)
{
    this._coastToHalt(creep);
};

outlast.creepRoomTravel = function(creep)
{
    this._creepRoomTravel(creep);
};

outlast.flagPrepare = function(flag)
{
    return this.FLAG_IGNORE;
};

outlast.makeBody = function(spawn)
{
    const elvl = spawn.room.memory.elvl;

    if (elvl < 5)
    {
        return [];
    }


    return [TOUGH, TOUGH, TOUGH, MOVE, HEAL, HEAL, HEAL, HEAL, HEAL];
};

outlast.register();

module.exports = outlast;
