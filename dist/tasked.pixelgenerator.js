'use strict';

var Tasked = require('tasked.template');

var pixelGenerator = new Tasked('pixelGenerator');

pixelGenerator.act = function()
{
    if(Game.cpu.bucket == 10000)
    {
        Game.cpu.generatePixel();
    }
};

// to make routine.spawn stop complaining
pixelGenerator.makeBody = function(spawn)
{
    return undefined;
}

pixelGenerator.register();

module.exports = pixelGenerator;
