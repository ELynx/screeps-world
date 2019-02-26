var globals = require('globals');
var makeDebuggable = require('routine.debuggable');

function Process(id)
{
    this.id = id;

    makeDebuggable(this, 'Process');

    this.work = function(room, creeps)
    {
        this.debugHeader(room);
    };

    globals.registerRoomProcess(this);
};

module.exports = Process;
