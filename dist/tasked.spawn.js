'use strict';

var Tasked = require('tasked.template');
var queue  = require('routine.spawn');

var spawn = new Tasked('spawn');

/**
 * Should model be dismissed from spawn process
 **/
spawn.dismiss = function(model)
{
    if (model.memory && model.memory.flag)
    {
        const flag = Game.flags[model.memory.flag];
        return flag === undefined;
    }

    return false;
};

spawn._peekOrGet = function(queueCall)
{
    // prevent forever loop, should not happen
    let emergencyStop = 1000;
    while (emergencyStop > 0)
    {
        --emergencyStop;

        const inQueue = queueCall();

        if (inQueue === undefined)
        {
            return undefined;
        }
        else
        {
            if (this.dismiss(inQueue))
            {
                queue.get(); // dispose of element
                continue;    // to next queueCall
            }

            return inQueue;
        }
    }

    console.log('spawn._peekOrGet error condition detected');

    return undefined;
};

spawn._queueCallPeek = function()
{
    return queue.peek();
};

spawn._queueCallGet = function()
{
    return queue.get();
};

spawn.peek = function()
{
    return this._peekOrGet(this._queueCallPeek);
};

spawn.get = function()
{
    return this._peekOrGet(this._queueCallGet);
};

spawn._spawnRoomFilter = function(room)
{
    if (room && room.controller && room.controller.my)
    {
        return room.memory.elvl > 0;
    }

    return false;
};

spawn._findAllSpawnRooms = function()
{
    let sourceRooms = [];
    for (const roomName in Game.rooms)
    {
        const room = Game.rooms[roomName];
        if (this._spawnRoomFilter(room))
        {
            sourceRooms.push(room);
        }
    }

    return sourceRooms;
};

spawn.findStrongestSpawnRoom = function()
{
    let sourceRooms = this._findAllSpawnRooms();
    sourceRooms.sort(
        function(room1, room2)
        {
            return room2.memory.elvl - room1.memory.elvl;
        }
    );

    return sourceRooms;
};

spawn.findClosestSpawnRoom = function(targetRoomName)
{
    let sourceRooms = this._findAllSpawnRooms();
    sourceRooms.sort(
        function(room1, room2)
        {
            const d1 = Game.map.getRoomLinearDistance(room1.name, targetRoomName);
            const d2 = Game.map.getRoomLinearDistance(room2.name, targetRoomName);

            return d1 - d2;
        }
    );

    return sourceRooms;
};

spawn.spawnNext = function()
{
    const nextModel = this.peek();

    îf (nextModel === undefined) return false;

    let sourceRooms = undefined;
    if (nextModel.from == queue.FROM_ANY_ROOM)
    {
        sourceRooms = this.findStrongestSpawnRoom();
    }
    else
    {
        // "from" is tested as well, then others as backups
        sourceRooms = this.findClosestSpawnRoom(nextModel.from);
    }

    if (sourceRooms.length == 0) return false;

    return false;
}

spawn.act = function()
{
    let spawned = 0;
    while (this.spawnNext())
    {
        ++spawned;
    }
};

spawn.register();

module.exports = spawn;
