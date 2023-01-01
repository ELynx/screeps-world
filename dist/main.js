'use strict';

var extensions      = require('extensions');
var cleanupMemory   = require('routine.memory');
var roomActor       = require('actor.room');
var taskedStrelok   = require('tasked.strelok');
var taskedClaim     = require('tasked.claim');
var pixelActor      = require('actor.pixelgenerator');
//const profiler    = require('screeps-profiler');

console.log('T: ' + Game.time + ' Loading took ' + Game.cpu.getUsed() + ' CPU');

//profiler.registerObject(roomActor, 'roomActor');

//profiler.enable();

module.exports.loop = function()
{
    //profiler.wrap(function() {

    cleanupMemory();

    let limits = { };
    let total  = 0;

    for (let creepName in Game.creeps)
    {
        const creep = Game.creeps[creepName];
        const room  = creep.room;

        // STRATEGY limit weight for controlled vs other rooms, per creep
        const delta = (room.controller && room.controller.my) ? 3 : 2;

        let now = limits[room.name] || 0;
        now = now + delta;
        limits[room.name] = now;

        total = total + delta;
    }

    for(const name in Game.rooms)
    {
        let room = Game.rooms[name];

        const r = limits[name] || 0;
        const t = total + 1;
        const limit = Math.ceil(100 * r / t);

        room.visual.rect(0, 0, 5,         0.5, { fill: '#0f0' });
        room.visual.rect(0, 0, 5 * r / t, 0.5, { fill: '#03f' });

        // save CPU on all rooms where control is not needed
        if (room.controller && room.controller.my)
        {
            room.memory.cpul = limit;
            roomActor.act(room);
        }
    }

    taskedStrelok.act();
    taskedClaim.act();

    pixelActor.act();

    //});
}
