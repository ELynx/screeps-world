'use strict';

var Tasked = require('tasked.template');

var pixelGenerator = Tasked('pixelGenerator');

pixelGenerator.act = function()
{
    if(Game.cpu.bucket == 10000)
    {
        Game.cpu.generatePixel();
    }
}

pixelGenerator.register();

module.exports = pixelGenerator;
