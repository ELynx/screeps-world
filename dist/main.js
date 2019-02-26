var globals = require('globals');

var memoryManager = require('routine.memory');

var roomActor = require('actor.room');

module.exports.loop = function ()
{
    globals.debugReset();

    memoryManager.cleanup();

    roomActor.act(Game.rooms['sim']);
}
