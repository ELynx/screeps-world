'use strict'

const Tasked = require('./tasked.template')

const nuker = new Tasked('nuker')

StructureNuker.prototype.launchNuke = function (position) {
  console.log('Nuker from [' + this.room.name + '] launces a nuke to ' + position)
  return OK
}

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

    for (const nuker of local) {
      if (nuker._launched_) continue

      const rc = nuker.launchNuke(flag.pos)
      if (rc >= OK) {
        nuker._launched_ = true
        flag.remove()
        break // from local cycle
      }
    }
  }
}

nuker.register()

module.exports = nuker
