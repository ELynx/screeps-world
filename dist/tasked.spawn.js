'use strict';

var Tasked = require('tasked.template');
var queue  = require('routine.spawn');

var spawn = new Tasked('spawn');

/**
 * Should model be dismissed from spawn process
 **/
spawn.dismiss = function(model)
{
    if (model.memory && model.memory.flag)
    {
        const flag = Game.flags[model.memory.flag];
        return flag === undefined;
    }

    return false;
};

spawn._peekOrGet = function(queueCall)
{
    // prevent forever loop, should not happen
    let emergencyStop = 1000;
    while (emergencyStop > 0)
    {
        --emergencyStop;

        const inQueue = queueCall();

        if (inQueue === undefined)
        {
            return undefined;
        }
        else
        {
            if (this.dismiss(inQueue))
            {
                queue.get(); // dispose of element
                continue;    // to next queueCall
            }

            return inQueue;
        }
    }

    console.log('spawn._peekOrGet error condition detected');

    return undefined;
};

spawn._queueCallPeek = function()
{
    return queue.peek();
};

spawn._queueCallGet = function()
{
    return queue.get();
};

spawn.peek = function()
{
    return this._peekOrGet(this._queueCallPeek);
};

spawn.get = function()
{
    return this._peekOrGet(this._queueCallGet);
};

spawn.act = function()
{
    // TODO
    console.log(JSON.stringify(this.peek()));
};

spawn.register();

module.exports = spawn;
