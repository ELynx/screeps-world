var globals = require('globals');

var Process = require('process.template');

var mapProcess = new Process('map');

mapProcess.work = function(room, creeps)
{
    this.debugHeader(room);

    if (!room.memory.caveMap)
    {
        // TODO much logic
        room.memory.caveMap =
        //   t  l   b   r
            [
            [0, 0,  49, 12],
            [0, 12, 49, 24],
            [0, 24, 49, 36],
            [0, 36, 49, 49]
                          ];
    }

    //for (var i = 0; i < room.memory.caveMap.length; ++i)
    //{
    //    const cave = room.memory.caveMap[i];
    //    room.visual.rect(
    //        cave[1], cave[0], cave[3] - cave[1], cave[2] - cave[0],
    //        { fill: i % 2 ? '#f00' : '#00f', opacity: 0.16 }
    //    );
    //}

    for (var i = 0; i < creeps.length; ++i)
    {
        if (!globals.creepAssigned(creeps[i]))
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
    }
};

module.exports = mapProcess;
