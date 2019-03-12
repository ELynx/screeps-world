'use strict';

var globals = require('globals');
var makeDebuggable = require('routine.debuggable');

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
    @param {array<Creeps>} creeps that might be interesting for process.
    **/
    this.work = undefined;
};

module.exports = Process;
