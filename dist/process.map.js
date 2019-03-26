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
            [
            // x borders
            [ 0, 10, 20, 30, 40, 50],
            // y borders
            [ 0, 10, 20, 30, 40, 50]
                                   ];
    }

    if (this.verbose)
    {
        for (var x = 0; x < room.memory.caveMap[0].length - 1; ++x)
        {
            for (var y = 0; y < room.memory.caveMap[1].length - 1; ++y)
            {
                const x0 = room.memory.caveMap[0][x] - 0.5;
                const w  = room.memory.caveMap[0][x + 1] - x0 - 0.5;
                const y0 = room.memory.caveMap[1][y] - 0.5;
                const h  = room.memory.caveMap[1][y + 1] - y0 - 0.5;

                room.visual.rect(
                    x0, y0, w, h,
                    { fill: (x + y) % 2 == 0 ? '#f00' : '#00f', opacity: 0.16 }
                );
            }
        }
    }
};

mapProcess.register();

module.exports = mapProcess;
