'use strict';

var extensions    = require('extensions');
var memoryManager = require('routine.memory');
var roomActor     = require('actor.room');
var manualStrelok = require('manual.strelok');
var manualClaim   = require('manual.claim');
//const profiler  = require('screeps-profiler');

console.log('T: ' + Game.time + ' Loading took ' + Game.cpu.getUsed() + ' CPU');

//profiler.enable();

module.exports.loop = function()
{
    //console.log('Hard limit ' + Game.cpu.limit);
    //console.log('Soft limit ' + Game.cpu.tickLimit);
    //console.log('Bucket     ' + Game.cpu.bucket);

    //profiler.wrap(function() {

    memoryManager.cleanup();

    // one-shot, swap rstk flag
    // <<
    for (const name in Game.creeps)
    {
        var creep = Game.creeps[name];

        if (!creep.memory.once)
        {
            creep.memory.rstk = ! creep.memory.rstk;
            creep.memory.once = true;
        }
    }
    // >>

    for(const name in Game.rooms)
    {
        const room = Game.rooms[name];

        roomActor.act(room);
    }

    //});

    manualStrelok();
    manualClaim();

    //console.log('Used       ' + Game.cpu.getUsed());
}
