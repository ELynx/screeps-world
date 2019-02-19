var globals = require('globals');

var memoryManager = require('glue.memory');

var roomActor = require('actor.room');
var psychoActor = require('actor.psychowarfare');

module.exports.loop = function ()
{
    globals.debugReset();

    memoryManager.cleanup();

    roomActor.act(Game.rooms['sim']);
    //psychoActor.act(Game.rooms['sim']);
}
