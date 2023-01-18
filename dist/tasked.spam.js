'use strict';

var Tasked = require('tasked.template');

var spam = new Tasked('spam');

spam.creepPrepare = function(creep)
{
    this._flagCountCreep(creep);
};

spam.creepAtDestination = function(creep)
{
    // die at the border, draw enemy scavengers
};

spam.flagPrepare = function(flag)
{
    return this._flagCountBasic(flag, 10);
};

spam.makeBody = function(spawn)
{
    return [MOVE];
};

spam.register();

module.exports = spam;
