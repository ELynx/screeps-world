'use strict';

var pixelGeneratorActor =
{
    act: function()
    {
        if(Game.cpu.bucket == 10000)
        {
            Game.cpu.generatePixel();
        }
    }
};

module.exports = pixelGeneratorActor;
