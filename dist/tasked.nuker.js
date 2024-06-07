'use strict'

const Tasked = require('./tasked.template')

const nuker = new Tasked('nuker')

nuker.act = function () {
  // << this is duct tape but I am losing my cycle of special interest to it will stay here for a while
  for (const roomName of Game.roomsToScan.values()) {
    for (const observer of Game.observers.values()) {
      if (observer._observed_) continue

      const rc = observer.observeRoom(roomName)
      if (rc >= OK) {
        observer._observed_ = true
        break // from observer loop
      }
    }
  }
  // >>

  const flags = Game.flagsByShortcut[this.id] || []
  if (flags.length === 0) return

  const nukers = Array.from(Game.nukers.values())
  if (nukers.length === 0) return

  for (const flag of flags) {
    const local = nukers.slice(0)
    local.sort(
      (n1, n2) => {
        const d1 = n1.pos.getRoomLinearDistance(flag.pos)
        const d2 = n2.pos.getRoomLinearDistance(flag.pos)
        return d1 - d2
      }
    )

    for (const someNuker of local) {
      if (someNuker._launched_) continue

      const rc = someNuker.launchNuke(flag.pos)
      if (rc >= OK) {
        someNuker._launched_ = true
        flag.remove()
        break // from local cycle
      }
    }
  }
}

nuker.register()

module.exports = nuker
