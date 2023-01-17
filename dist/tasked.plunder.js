'use strict';

var Tasked = require('tasked.template');

var plunder = new Tasked('plunder');

plunder.prepare = function()
{
    this.roomTargets = { };
    this.roomBoring  = { };
};

plunder.creepPrepare = function(creep)
{
    this._flagCountCreep(creep);
};

plunder.moveAndUnload = function(creep, target)
{
    let range = undefined;
    let pos   = undefined;

    if (target.pos)
    {
        range = 1;
        pos   = target.pos;
    }
    else
    {
        range = 5; // good enough
        pos   ? target;
    }

    if (creep.pos.inRangeTo(pos, range))
    {
        for (const resourceType in creep.store)
        {
            if (target.store && target.store.getFreeCapacity(resourceType) > 0)
            {
                creep.transfer(target, resourceType);
            }
            else
            {
                creep.drop(resourceType);
            }
        }
    }
    else
    {
        creep.moveToWrapper(pos, { reusePath: 50, range: range });
    }

    if (creep.store.getUsedCapacity() == 0)
    {
        const whereFlag = creep.getFlagPos();
        if (whereFlag)
        {
            creep.memory.crum = whereFlag.roomName;
        }
        else
        {
            creep.unlive();
        }
    }
};

pluner.creepAtOwnRoom = function(creep)
{
    if (creep.room.storage)
    {
        this.moveAndUnload(creep, creep.room.storage);
    }
    else if (creep.room.terminal)
    {
        this.moveAndUnload(creep, creep.room.terminal);
    }
    else
    {
        this.moveAndUnload(creep, creep.getControlPos());
    }
};

plunder.getSomeOwnRoomName = function(creep)
{
    const storage = creep.memory.storage ? Game.getObjectById(creep.memory.storage) : undefined;
    if (storage) return storage.pos.roomName;

    const terminal = creep.memory.terminal ? Game.getObjectById(creep.memory.terminal) : undefined;
    if (terminal) return terminal.pos.roomName;

    const controller = creep.memory.controller ? Game.getObjectById(creep.memory.controller) : undefined;
    if (controller) return controller.pos.roomName;

    return undefined;
};

plunder.creepAtOtherRooms = function(creep)
{
    let targets = this.roomTargets[creep.pos.roomName];
    if (targets === undefined)
    {
        // TODO
        targets = [];

        this.roomTargets[creep.pos.roomName] = targets;
    }

    if (targets.length == 0)
    {
        this.roomBoring[creep.pos.roomName] = true;
    }

    if (targets.length == 0 || creep.store.getFreeCapacity() == 0)
    {
        creep.memory.crum = this.getSomeOwnRoomName(creep);
    }
};

plunder.creepAtDestination = function(creep)
{
    if (creep.room.controller && creep.room.controller.my)
    {
        this.creepAtOwnRoom(creep);
    }
    else
    {
        this.creepAtOtherRooms(creep);
    }
};

plunder.creepRoomTravel = function(creep)
{
    // keep track of closest owned stuff

    if (creep.room.storage && creep.room.storage.my)
        creep.memory.storage = creep.room.storage.id;

    if (creep.room.terminal && creep.room.terminal.my)
        creep.memory.terminal = creep.room.terminal.id;

    if (creep.room.controller && creep.room.controller.my)
        creep.memory.controller = creep.room.controller.id;

    this._creepRoomTravel(creep);
};

plunder.flagPrepare = function(flag)
{
    if (this.roomBoring[flag.pos.roomName]) return this.FLAG_REMOVE;

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
