'use strict';

var Process = require('process.template');

var linkProcess = new Process('link');

linkProcess.work = function(room)
{
    this.debugHeader(room);
};

linkProcess.register();

module.exports = linkProcess;
