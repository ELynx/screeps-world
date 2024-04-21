'use strict'

const cookActor =
{
  roomCanHandleNonEnergy: function (room) {
    console.log('TODO canRoomGrabNonEnergy => true')
    return room !== undefined
  },

  act: function () {
    console.log('We need to cook')
  }
}

module.exports = cookActor
