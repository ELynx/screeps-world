'use strict';

var globals = require('globals');
var makeDebuggable = require('routine.debuggable');
//const profiler = require('screeps-profiler');

function Process(id)
{
    /**
    Unique identifier.
    **/
    this.id = id;

    // attach methods that allow fast debug writing
    makeDebuggable(this, 'Process');

    /**
    Work on a room.
    @param {Room} room to process.
    **/
    this.work = undefined;

    this.register = function()
    {
        //profiler.registerObject(this, this.id);
    };
};

module.exports = Process;
