'use strict'

if (!(new PathFinder.CostMatrix())._bits) {
  console.log('CostMatrix missing _bits')
}

PathFinder.CostMatrix.prototype.setBordersUnwalkable = function () {
  if (!this._bits) {
    return
  }

  for (let index = 0; index <= 49; ++index) {
    this._bits[index] = 255
    this._bits[index + 2450] = 255
  }

  for (let row = 1; row <= 48; ++row) {
    const index0 = row * 50
    this._bits[index0] = 255
    this._bits[index0 + 49] = 255
  }
}

PathFinder.CostMatrix.prototype.setStationaryCreepsUnwalkabke = function () {
}

const map = {
  costCallback_costMatrixWithUnwalkableBorders: function (roomName, costMatrix) {
    if (Game.__unwalkableBordersCostCallbackCache === undefined) {
      Game.__unwalkableBordersCostCallbackCache = { }
    }

    const cached = Game.__unwalkableBordersCostCallbackCache[roomName]
    if (cached) {
      return cached
    }

    const modified = costMatrix.clone()
    modified.setBordersUnwalkable()

    Game.__unwalkableBordersCostCallbackCache[roomName] = modified

    return modified
  },

  costCallback_costMatrixForRoomActivity: function (roomName, costMatrix) {
    if (Game.__roomActivityCostCallbackCache === undefined) {
      Game.__roomActivityCostCallbackCache = { }
    }

    const cached = Game.__roomActivityCostCallbackCache[roomName]
    if (cached) {
      return cached
    }

    const modified = costMatrix.clone()
    modified.setBordersUnwalkable()
    modified.setStationaryCreepsUnwalkabke()

    Game.__roomActivityCostCallbackCache[roomName] = modified

    return modified
  }
}

module.exports = map
