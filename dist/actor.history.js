'use strict'

const historyActor =
{
  verbose: false,

  debugLine: function (what) {
    if (this.verbose) {
      console.log(what)
    }
  },

  /**
    Execute history logic.
    **/
  act: function () {
  }
}

module.exports = historyActor
