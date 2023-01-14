'use strict';

var Process = require('process.template');
var globals = require('globals');
var queue   = require('routine.spawn');

var spawnProcess = new Process('spawn');

spawnProcess.work = function(room)
{
    this.debugHeader(room);

    const haveOrSpawning = room.getRoomControlledCreeps().length;
    const inQueue = queue.count(room.name);

    const want = 6;

    const delta = want - haveOrSpawning - inQueue;
    if (delta > 0)
    {
        queue.addLowkey(
            room.name,
            'worker',
            'worker_' + room.name,
            {
                crum: room.name,
                ctrl: globals.NO_CONTROL,
                dest: globals.NO_DESTINATION,
                dact: globals.NO_ACT_RANGE,
                xtra: globals.NO_EXTRA,
                btyp: 'worker',
                hvst: true,
                rstk: undefined,
                minr: undefined
            },
            room.name,
            room.name,
            delta
        );
    }
};

spawnProcess.register();

module.exports = spawnProcess;
