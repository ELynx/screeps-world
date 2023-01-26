/* eslint curly: "error" */
'use strict'

const Tasked = require('tasked.template')

const pixelGenerator = new Tasked('pixelGenerator')

pixelGenerator.act = function () {
  if (Game.cpu.bucket === 10000) {
    Game.cpu.generatePixel()
  }
}

pixelGenerator.register()

module.exports = pixelGenerator
