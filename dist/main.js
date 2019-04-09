'use strict';

var extensions     = require('extensions');
var cleanupMemory  = require('routine.memory');
var roomActor      = require('actor.room');
var warStrelok     = require('war.strelok');
//const profiler   = require('screeps-profiler');

console.log('T: ' + Game.time + ' Loading took ' + Game.cpu.getUsed() + ' CPU');

//profiler.registerObject(roomActor, 'roomActor');

//profiler.enable();

module.exports.loop = function()
{
    //console.log('Hard limit ' + Game.cpu.limit);
    //console.log('Soft limit ' + Game.cpu.tickLimit);
    //console.log('Bucket     ' + Game.cpu.bucket);

    //profiler.wrap(function() {

    cleanupMemory();

    for(const name in Game.rooms)
    {
        const room = Game.rooms[name];

        // save CPU on all rooms where control is not needed
        if (room.controller && room.controller.my)
        {
            roomActor.act(room);
        }
    }

    warStrelok.act();

    //});

    //console.log('Used       ' + Game.cpu.getUsed());
}
