'use strict';

var Tasked = require('tasked.template');

var outlast = new Tasked('outlast');

outlast._defaultAction = function(creep)
{
    if (creep.hits < creep.hitsMax)
    {
        creep.heal(creep);
    }
    else
    {
        const creeps = creep.room.find(
            FIND_CREEPS,
            {
                filter: _.bind(
                    function(someCreep)
                    {
                        return someCreep.my &&
                               someCreep.id != this.id &&
                               someCreep.hits < someCreep.hitsMax &&
                               someCreep.pos.inRangeTo(this, 3);
                    },
                    creep
                )
            }
        );
        creep.healClosest(creeps);
    }
};

outlast.creepPrepare = function(creep)
{
    if (creep.memory.counted) return;

    let flag = Game.flags[creep.memory.flag];
    if (flag && flag.memory.counter)
    {
        --flag.memory.counter;
        creep.memory.counted = true;
    }
};

outlast.creepAtDestination = function(creep)
{
    this._defaultAction(creep);
    creep.memory.selfCanHeal = undefined; // point towers at this
    creep.memory.blink = true; // mark blinking
};

outlast.creepRoomTravel = function(creep)
{
    this._defaultAction(creep);

    const selfCanHeal = creep.getActiveBodyparts(HEAL) * HEAL_POWER;
    creep.memory.selfCanHeal = selfCanHeal; // safe, tell towers

    if (!creep.memory.blink)
    {
        this._creepRoomTravel(creep);
        return;
    }

    // don't waste CPU
    if (!creep._canMove_) return;

    // let room travel do the step
    let autoMove = true;

    const damage = creep.hitsMax - creep.hits;
    if (damage <= selfCanHeal)
    {
        let erasePath = false;

        // stay on transit
        if      (creep.pos.x ==  0) autoMove = false;
        else if (creep.pos.x == 49) autoMove = false;
        else if (creep.pos.y ==  0) autoMove = false;
        else if (creep.pos.y == 49) autoMove = false;
        // step towards room, check for collisions
        else if (creep.pos.x ==  1) erasePath = true;
        else if (creep.pos.x == 48) erasePath = true;
        else if (creep.pos.y ==  1) erasePath = true;
        else if (creep.pos.y == 48) erasePath = true;

        if (erasePath) creep.memory._move = undefined;
    }
    else
    {
        let flee = false;

        // step away from transit
        if      (creep.pos.x ==  0) flee = true;
        else if (creep.pos.x == 49) flee = true;
        else if (creep.pos.y ==  0) flee = true;
        else if (creep.pos.y == 49) flee = true;
        // stay one step away from transit
        else if (creep.pos.x ==  1) autoMove = false;
        else if (creep.pos.x == 48) autoMove = false;
        else if (creep.pos.y ==  1) autoMove = false;
        else if (creep.pos.y == 48) autoMove = false;

        if (flee)
        {
            autoMove = false;
            const pos = creep.room.getControlPos();
            const range = pos.controlDistance();

            creep.moveToWrapper(pos, { range: range });
        }
    }

    if (autoMove)
    {
        this._creepRoomTravel(creep);
    }
};

outlast.flagPrepare = function(flag)
{
    if (flag.memory.counter === undefined)
        flag.memory.counter = 20;

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
    // heal damage in 5 turns
    // 1500 50    50    50    50    50    250   250   250   250   250
    return [MOVE, MOVE, MOVE, MOVE, MOVE, HEAL, HEAL, HEAL, HEAL, HEAL];
};

outlast.register();

module.exports = outlast;
