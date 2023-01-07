'use strict';

var Process = require('process.template');

var autobuildProcess = new Process('autobuild');

autobuildProcess.actualWork = function(room)
{
    // TODO
};

autobuildProcess.work = function(room)
{
    this.debugHeader(room);

    let executeAutoBuild = false;

    if (Game.rooms.sim)
    {
        // in simulator, always plan
        executeAutoBuild = true;
    }
    else
    {
        const wasUndefined = room.memory.abld === undefined;

        // once in 6 creep generations
        if (room.memory.abld === undefined ||
            room.memory.abld < Game.time - (6 * CREEP_LIFE_TIME))
        {
            // offset regeneration time randomly so multiple rooms don't do it at same tick
            room.memory.abld = Game.time + Math.ceil(Math.random() * 6 * CREEP_LIFE_TIME);
        }

        executeAutoBuild = !wasUndefined;
    }

    if (executeAutoBuild)
    {
        this.debugLine(room, 'Executing autobuild process');

        console.log('Autobuild for room ' + room.name + ' started');
        this.actualWork(room);
        console.log('Autobuild for room ' + room.name + ' finished');
    }
};

autobuildProcess.register();

module.exports = autobuildProcess;
