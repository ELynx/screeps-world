'use strict';

var Tasked = require('tasked.template');
var queue  = require('routine.spawn');

var spawn = new Tasked('spawn');

spawn.act = function()
{
    // TODO
    console.log(JSON.stringify(queue.peek()));
};

spawn.register();

module.exports = spawn;
