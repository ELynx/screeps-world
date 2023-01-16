'use strict';

var Tasked = require('tasked.template');

var spam = new Tasked('spam');

plunder.creepAtDestination = function(creep)
{
    // die at the border, draw enemy scavengers
};

spam.flagPrepare = function(flag)
{
    return this.FLAG_SPAWN;
};

spam.makeBody = function(spawn)
{
    return [MOVE];
};

spam.register();

module.exports = spam;
