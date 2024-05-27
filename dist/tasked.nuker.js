'use strict'

const Tasked = require('./tasked.template')

const nuker = new Tasked('nuker')

nuker.act = function () {
  const flags = Game.flagsByShortcut[this.id] || []
  if (flags.length === 0) return

  const nukers = Array.from(Game.nukers.values())
  if (nukers.length === 0) return

  for (const flag of flags) {
    const local = nukers.slice(0)
    local.sort(
      (n1, n2) => {
        const d1 = Game.map.getRoomLinearDistance(n1.room.name, flag.pos.roomName)
        const d2 = Game.map.getRoomLinearDistance(n2.room.name, flag.pos.roomName)
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
