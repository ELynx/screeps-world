'use strict';

var Tasked = require('tasked.template');

var claim = new Tasked('claim');

claim.creepAtDestination = function(creep)
{
    const controller = creep.room.controller;
    if (controller && !controller.my)
    {
        if (creep.pos.isNearTo(controller))
        {
            controller.room.memory.sstr = creep.getSourceRoom();
            creep.signController(controller, '');
            creep.claimController(controller);
        }
        else
        {
            creep.moveTo(controller, { plainCost: 1, swampCost: 5, maxRooms: 1, reusePath: 50, range: 1 });
        }
    }
    else
    {
        this._coastToHalt(creep);
    }
};

claim.flagPrepare = function(flag)
{
    // done about it
    if (flag.room && flag.room.controller && flag.room.controller.my)
    {
        return this.FLAG_REMOVE;
    }

    return this.FLAG_SPAWN;
};

claim.makeBody = function(spawn)
{
    return [ TOUGH, CLAIM, MOVE, MOVE ];
};

claim.register();

module.exports = claim;
