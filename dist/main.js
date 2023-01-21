'use strict';

var iff           = require('iff');
var extensions    = require('extensions');

var cleanupMemory = require('routine.memory');
var roomActor     = require('actor.room');
var worldActor    = require('actor.world');

const profiler    = require('screeps-profiler');

console.log('T: ' + Game.time + ' Loading took ' + Game.cpu.getUsed() + ' CPU');
console.log('Lodash version ' + _.VERSION + ' documented at https://lodash.com/docs/' + _.VERSION);

profiler.registerObject(roomActor,  'roomActor');
profiler.registerObject(worldActor, 'worldActor');

// enable profiler with a flag on map during load
if (Game.flags.profiler && Game.flags.profiler.pos)
{
    console.log('Profiler enabled by flag in room ' + Game.flags.profiler.pos.roomName);
    profiler.enable();
}
else
{
    profiler.disable();
}

module.exports.loop = function()
{
    profiler.wrap(function() {

    cleanupMemory();

    let limits = { };
    let total  = 0;

    for (const creepName in Game.creeps)
    {
        const creep = Game.creeps[creepName];
        const room  = creep.room;

        // STRATEGY limit weight for controlled vs travel rooms, per creep
        const delta = room.canControlStructures() ? 3 : 1;

        let now = limits[room.name] || 0;
        now = now + delta;
        limits[room.name] = now;

        total = total + delta;
    }

    if (total == 0) total = 1;

    for(const roomName in Game.rooms)
    {
        let room = Game.rooms[roomName];

        const r = limits[room.name] || 0;
        const t = total;
        const limit = Math.ceil(100 * r / t);

        room.visual.rect(0, 0, 5,         0.5,  { fill: '#0f0' });
        room.visual.rect(0, 0, 5 * r / t, 0.25, { fill: '#03f' });

        // save CPU on all rooms where control is not needed
        if (room.canControlStructures())
        {
            room.memory.cpul = limit;
            roomActor.act(room);
        }
        else
        {
            room.memory.cpul = undefined;
        }
    }

    worldActor.act();

    });
}
