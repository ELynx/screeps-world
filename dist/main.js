var memoryManager       = require('glue.memory');

var roomActor           = require('actor.room');

module.exports.loop = function ()
{
    memoryManager.cleanup();

    roomActor.act(Game.rooms['sim']);
}
