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
        pos   = target;
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
            creep.setControlRoom(whereFlag.roomName);
        }
        else
        {
            creep.unlive();
        }
    }
};

plunder.creepAtOwnRoom = function(creep)
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

plunder.moveAndLoad = function(creep, target)
{
    if (creep.pos.isNearTo(target))
    {
        for (let resourceType in target.store)
        {
            const rc = creep.withdraw(target, resourceType);
            if (rc != OK) break;
        }
    }
    else
    {
        creep.moveToWrapper(target, { reusePath: 50, range: 1 });
    }
};

plunder.creepAtOtherRooms = function(creep)
{
    let targets = this.roomTargets[creep.pos.roomName];
    if (targets === undefined)
    {
        const allStructures = creep.room.find(FIND_STRUCTURES);
        const ramparts = _.filter(allStructures, { structureType: STRUCTURE_RAMPART });

        targets = _.filter(
            allStructures,
            function(structure)
            {
                if (structure.store === undefined) return false;
                if (structure.store.getUsedCapacity() == 0) return false;

                if (structure.store.getUsedCapacity() == null)
                    if (structure.store.getUsedCapacity(RESOURCE_ENERGY) == 0)
                        return false;

                const hasRamp = _.some(
                    ramparts,
                    function(ramp)
                    {
                        return ramp.pos.x == structure.pos.x && ramp.pos.y == structure.pos.y;
                    }
                );

                return !hasRamp;
            }
        );

        this.roomTargets[creep.pos.roomName] = targets;
    }

    if (targets.length == 0)
    {
        this.roomBoring[creep.pos.roomName] = true;
    }

    if (targets.length == 0 || creep.store.getFreeCapacity() == 0)
    {
        creep.setControlRoom(this.getSomeOwnRoomName(creep));
        return;
    }

    let target = undefined;
    if (creep.memory.dest)
    {
        target = _.find(targets, { id: creep.memory.dest });
    }

    if (target === undefined)
    {
        target = creep.pos.findClosestByRange(targets);
        creep.memory.dest = target.id;
    }

    this.moveAndLoad(creep, target);
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

    return this._flagCountBasic(flag, 100);
};

plunder.makeBody = function(spawn)
{
    const elvl = spawn.room.memory.elvl;

    if (elvl <= 1)
    {
        // 100   50     50
        return [ CARRY, MOVE ];
    }

    if (elvl <= 3)
    {
        // 300   50     50     50     50    50    50
        return [ CARRY, CARRY, CARRY, MOVE, MOVE, MOVE ];
    }

    // capacity 200, steal complete full built extension
    // 600   50     50     50     50     50    50    50    50
    return [ CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE ];
};

plunder.register();

module.exports = plunder;
