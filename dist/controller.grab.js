'use strict'

const Controller = require('./controller.template')

const grabController = new Controller('grab')

grabController.actRange = 1

grabController.ally = true
grabController.neutral = grabController.ally
grabController.unowned = grabController.ally

grabController.act = function (arg0, creep) {
  const hasUniversalStore = creep.room.storage || creep.room.terminal

  const [t, l, b, r] = creep.pos.squareArea(this.actRange)
  const grabs = creep.room.lookAtArea(t, l, b, r, true)

  for (let i = 0; i < grabs.length; ++i) {
    const grab = grabs[i]
    const from = grab[grab.type]

    if (grab.type === LOOK_TOMBSTONES ||
            grab.type === LOOK_RUINS) {
      const typesToGrab = hasUniversalStore ? Object.keys(from.store) : [RESOURCE_ENERGY]

      for (let j = 0; j < typesToGrab.length; ++j) {
        const typeToGrab = typesToGrab[j]
        if (from.store.getUsedCapacity(typeToGrab) > 0) {
          const rc = this.wrapIntent(creep, 'withdraw', from, typeToGrab)
          if (rc !== OK) return rc
        }
      }
    }

    if (grab.type === LOOK_RESOURCES) {
      if (hasUniversalStore || from.resourceType === RESOURCE_ENERGY) {
        const rc = this.wrapIntent(creep, 'pickup', from)
        if (rc !== OK) return rc
      }
    }
  }

  return OK
}

grabController.filterCreep = function (creep) {
  return this._hasFreeCapacity(creep)
}

grabController.register()

module.exports = grabController
