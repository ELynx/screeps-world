'use strict'

const Tasked = require('./tasked.template')

const pixelGenerator = new Tasked('pixelGenerator')

pixelGenerator.act = function () {
  if (Game.cpu.bucket >= PIXEL_CPU_COST) {
    Game.cpu.generatePixel()
  }
}

pixelGenerator.register()

module.exports = pixelGenerator
