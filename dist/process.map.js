'use strict';

var Process = require('process.template');

var mapProcess = new Process('map');

mapProcess.work = function(room, creeps)
{
    this.debugHeader(room);

    if (!room.memory.caveMap)
    {
        // TODO generate rooms with equal free space
        room.memory.caveMap =
        //   t   l   b   r
            [
            [ 0,  0,  9,  9],
            [ 0, 10,  9, 19],
            [ 0, 20,  9, 29],
            [ 0, 30,  9, 39],
            [ 0, 40,  9, 49],

            [10,  0, 19,  9],
            [10, 10, 19, 19],
            [10, 20, 19, 29],
            [10, 30, 19, 39],
            [10, 40, 19, 49],

            [20,  0, 29,  9],
            [20, 10, 29, 19],
            [20, 20, 29, 29],
            [20, 30, 29, 39],
            [20, 40, 29, 49],

            [30,  0, 39,  9],
            [30, 10, 39, 19],
            [30, 20, 39, 29],
            [30, 30, 39, 39],
            [30, 40, 39, 49],

            [40,  0, 49,  9],
            [40, 10, 49, 19],
            [40, 20, 49, 29],
            [40, 30, 49, 39],
            [40, 40, 49, 49]
                           ];
    }

    if (this.verbose)
    {
        for (var i = 0; i < room.memory.caveMap.length; ++i)
        {
            const cave = room.memory.caveMap[i];
            room.visual.rect(
                cave[1], cave[0], cave[3] - cave[1], cave[2] - cave[0],
                { fill: i % 2 ? '#f00' : '#00f', opacity: 0.16 }
            );
        }
    }

    for (var i = 0; i < creeps.length; ++i)
    {
        // TODO much logic
        var x = creeps[i].pos.x;
        var caveIndex = 0;
        if (x > 36)
            caveIndex = 3;
        else if (x > 24)
            caveIndex = 2;
        else if (x > 12)
            caveIndex = 1;

        creeps[i].memory.cidx = caveIndex;
    }
};

module.exports = mapProcess;
