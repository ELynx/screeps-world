'use strict';

var globals = require('globals');

/**
Order of load is priority for task execution.
**/
// generate spawn(s)
var taskedOutlast = require('tasked.outlast'); // very tick-sensitive logic, run first
var taskedBeetle  = require('tasked.beetle');  // generates aggro
var taskedStrelok = require('tasked.strelok'); // consumes aggro
var taskedPlunder = require('tasked.plunder'); // paramilitary
var taskedClaim   = require('tasked.claim');   // one-off
var taskedSpam    = require('tasked.spam');    // lowest prio
// consume spawn(s)
var taskedSpawn   = require('tasked.spawn');
// other
var taskedPixel   = require('tasked.pixelgenerator');

var worldActor =
{
    verbose: false,

    debugLine: function(what)
    {
        if (this.verbose)
        {
            console.log(what);
        }
    },

    /**
    Let task controllers do theit jobs.
    **/
    taskControllersControl: function()
    {
        for (const id in globals.taskControllers)
        {
            this.debugLine('Tasked about to act [' + id + ']');
            globals.taskControllers[id].act();
        }
    },

    /**
    Execute world level logic.
    **/
    act: function()
    {
        // mark initial time
        const t0 = Game.cpu.getUsed();

        globals.cleanUpFlags();

        this.taskControllersControl();

        const usedPercent = globals.hardCpuUsed(t0);
        this.debugLine('HCPU: ' + usedPercent + '%');

        for (const roomName in Game.rooms)
        {
            const room = Game.rooms[roomName];
            room.visual.rect(5.5, 0, 5                    , 0.5, { fill: '#0f0' });
            room.visual.rect(5.5, 0, 5 * usedPercent / 100, 0.5, { fill: '#f00' });
        }
    } // end of act method
};

module.exports = worldActor;
