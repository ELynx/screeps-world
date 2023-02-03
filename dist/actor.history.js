'use strict'

const bootstrap = require('./bootstrap')

const historyActor =
{
  verbose: true,

  debugLine: function (room, what) {
    if (this.verbose) {
      room.roomDebug(what)
    }
  },

  handle_EVENT_ATTACK: function (room, eventRecord) {
    this.debugLine(room, eventRecord.objectId)
  },

  /**
    Execute history logic.
    **/
  act: function () {
    // mark initial overall time
    const t0 = Game.cpu.getUsed()

    for (const roomName in Game.rooms) {
      const t1 = Game.cpu.getUsed()

      const room = Game.rooms[roomName]
      room.visual.rect(0, 0, 5, 0.5, { fill: '#0f0' })

      const eventLog = room.getEventLog()

      for (const index in eventLog) {
        const eventRecord = eventLog[index]

        switch (eventRecord.event) {
        case EVENT_ATTACK:
          this.handle_EVENT_ATTACK(room, eventRecord)
          break
        }
      }

      const usedRoomPercent = bootstrap.hardCpuUsed(t1)
      this.debugLine(room, 'HCPU: ' + usedRoomPercent + '% on history actor / room')
      room.visual.rect(0, 0.25, 5 * usedRoomPercent / 100, 0.25, { fill: '#f00' })
    }

    const usedTotalPercent = bootstrap.hardCpuUsed(t0)
    for (const roomName in Game.rooms) {
      const room = Game.rooms[roomName]
      this.debugLine(room, 'HCPU: ' + usedTotalPercent + '% on history actor / total')
      room.visual.rect(0, 0, 5 * usedTotalPercent / 100, 0.5, { fill: '#03f' })
    }
  }
}

module.exports = historyActor
