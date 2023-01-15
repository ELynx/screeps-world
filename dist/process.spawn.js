'use strict';

var Process = require('process.template');
var globals = require('globals');
var queue   = require('routine.spawn');

var spawnProcess = new Process('spawn');

spawnProcess.makeKey = function(room, type)
{
    return type + '_' + room.name;
};

spawnProcess._addToQueue = function(room, type, memoryAddon, n, adderFunction)
{
    const key = this.makeKey(room, type);

    let memory =
    {
        crum: room.name,
        ctrl: globals.NO_CONTROL,
        dest: globals.NO_DESTINATION,
        dact: globals.NO_ACT_RANGE,
        xtra: globals.NO_EXTRA,
        btyp: type
    };
    _.assign(memory, memoryAddon);

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

spawnProcess.addToQueue = function(room, type, memory, n, priority)
{
    if (n <= 0) return;

    if (priority == 'urgent')
    {
        this._addToQueue(room, type, memory, n, queue.addUrgent);
    }
    else if (priority == 'normal')
    {
        this._addToQueue(room, type, memory, n, queue.addNormal);
    }
    else if (priority == 'lowkey')
    {
        this._addToQueue(room, type, memory, n, queue.addLowkey);
    }
};

spawnProcess.workers = function(room, live)
{
};

spawnProcess.restockers = function(room, live)
{
};

spawnProcess.miners = function(room, live)
{
};

spawnProcess.work = function(room)
{
    this.debugHeader(room);

    let live = _.countBy(room.getRoomControlledCreeps(), 'memory.btyp');

    this.workers(room, live);
    this.restockers(room, live);
    this.miners(room, live);
};

spawnProcess.register();

module.exports = spawnProcess;
