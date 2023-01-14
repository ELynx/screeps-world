'use strict';

var Process = require('process.template');
var globals = require('globals');
var queue   = require('routine.spawn');

var spawnProcess = new Process('spawn');

spawnProcess.makeKey = function(room, type)
{
    return type + '_' + room.name;
};

spawnProcess._addToQueue = function(room, type, n, adderFunction)
{
    const key = this.makeKey(room, type);
    const memory =
    {
        crum: room.name,
        ctrl: globals.NO_CONTROL,
        dest: globals.NO_DESTINATION,
        dact: globals.NO_ACT_RANGE,
        xtra: globals.NO_EXTRA,
        btyp: type,
        hvst: true,
        rstk: undefined,
        minr: undefined
    };

    adderFunction(
        key,            // id in queue
        type,           // body function
        key,            // name prefix
        memory: memory, // memory
        room.name,      // from
        room.name,      // to
        n               // how much to add
    );
};

spawnProcess.addToQueue = function(room, type, n, priority)
{
    if (n <= 0) return;

    if (priority == 'urgent')
    {
        this._addToQueue(room, type, n, queue.addUrgent);
    }
    else if (priority == 'normal')
    {
        this._addToQueue(room, type, n, queue.addNormal);
    }
    else if (priority == 'lowkey')
    {
        this._addToQueue(room, type, n, queue.addLowkey);
    }
};

spawnProcess.work = function(room)
{
    this.debugHeader(room);

    const haveOrSpawning = room.getRoomControlledCreeps().length;
    const inQueue = queue.count(this.makeKey(room, type));

    const want = 6;

    const delta = want - haveOrSpawning - inQueue;

    this.addToQueue(room, 'worker', delta, 'lowkey');
};

spawnProcess.register();

module.exports = spawnProcess;
