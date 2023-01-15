'use strict';

var Tasked = require('tasked.template');

var outlast = new Tasked('outlast');

outlast.prepare = function()
{
};

outlast._defaultAction = function(creep)
{
    // TODO heal around
    if (creep.hits < creep.hitsMax)
    {
        creep.heal(creep);
    }
};

outlast.creepAtDestination = function(creep)
{
    // do not move away from border, warp back

    this._defaultAction(creep);
};

outlast._roomCanHeal = function(room)
{
    return 0;
};

outlast.creepRoomTravel = function(creep)
{
    this._defaultAction(creep);

    const damage      = creep.hitsMax - creep.hits;
    const selfCanHeal = creep.getActiveBodyparts(HEAL) * HEAL_POWER;
    const roomCanHeal = this._roomCanHeal(creep.room);

    let manualMove = false;
    if (damage <= selfCanHeal + roomCanHeal)
    {
        let rc = undefined;
        // stay on transit
        if      (creep.pos.x ==  0) rc = OK;
        else if (creep.pos.x == 49) rc = OK;
        else if (creep.pos.y ==  0) rc = OK;
        else if (creep.pos.y == 49) rc = OK;
        // step towards transit
        else if (creep.pos.x ==  1) rc = creep.move(LEFT);
        else if (creep.pos.x == 48) rc = creep.move(RIGHT);
        else if (creep.pos.y ==  1) rc = creep.move(TOP);
        else if (creep.pos.y == 48) rc = creep.move(BOTTOM);

        manualMove = rc == OK;
    }
    else
    {
        let rc = undefined;
        // step away from transit
        if      (creep.pos.x ==  0) rc = creep.move(RIGHT);
        else if (creep.pos.x == 49) rc = creep.move(LEFT);
        else if (creep.pos.y ==  0) rc = creep.move(BOTTOM);
        else if (creep.pos.y == 49) rc = creep.move(TOP);
        // stay one step away from transit
        else if (creep.pos.x ==  1) rc = OK;
        else if (creep.pos.x == 48) rc = OK;
        else if (creep.pos.y ==  1) rc = OK;
        else if (creep.pos.y == 48) rc = OK;

        manualMove = rc == OK;
    }

    if (!manualMove)
    {
        this._creepRoomTravel(creep);
    }
};

outlast.flagPrepare = function(flag)
{
    if (flag.memory.counter === undefined)
        flag.memory.counter = 21;

    --flag.memory.counter;

    if (flag.memory.counter >= 10)
        return this.FLAG_SPAWN;

    if (flag.memory.counter >= 0)
        return this.FLAG_IGNORE;

    return this.FLAG_REMOVE;
};

outlast.makeBody = function(spawn)
{
    const elvl = spawn.room.memory.elvl;

    if (elvl < 5)
    {
        return [];
    }

    // takes 300 damage
    // full heal in 5 turns
    // 1330 10     10     10     50    250   250   250   250   250
    return [TOUGH, TOUGH, TOUGH, MOVE, HEAL, HEAL, HEAL, HEAL, HEAL];
};

outlast.register();

module.exports = outlast;
