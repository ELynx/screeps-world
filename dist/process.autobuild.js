'use strict';

var Process = require('process.template');

var autobuildProcess = new Process('autobuild');

autobuildProcess.autobuildForce = function(roomName)
{
    Game.rooms[roomName].memory.autobuildForce = true;
};

autobuildProcess.actualWork = function(room)
{
    // TODO
};

autobuildProcess.work = function(room)
{
    this.debugHeader(room);

    let executeAutoBuild = false;

    if (room.memory.autobuildForce)
    {
        room.memory.autobuildForce = undefined;
        executeAutoBuild = true;
    }
    else
    {
        // once in 6 creep generations
        if (room.memory.abld === undefined ||
            room.memory.abld < Game.time - (6 * CREEP_LIFE_TIME))
        {
            executeAutoBuild = !(room.memory.abld === undefined);
        }
    }

    if (executeAutoBuild)
    {
        // offset regeneration time randomly so multiple rooms don't do it at same tick
        room.memory.abld = Game.time + Math.ceil(Math.random() * 6 * CREEP_LIFE_TIME);

        this.debugLine(room, 'Executing autobuild process');

        const t0 = Game.cpu.getUsed();
        console.log('Autobuild for room ' + room.name + ' started at ' + t0);

        this.actualWork(room);

        const t1 = Game.cpu.getUsed();
        console.log('Autobuild for room ' + room.name + ' finished at ' + t1 + ' and took ' + (t1 - t0));
    }
};

autobuildProcess.register = function()
{
    this._register();

    Game.autobuild =
    {
        force: function(roomName)
        {
            autobuildProcess.autobuildForce(roomName);
        }
    };
}

autobuildProcess.register();

module.exports = autobuildProcess;
