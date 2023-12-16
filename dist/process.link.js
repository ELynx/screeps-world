'use strict'

const Process = require('./process.template')

const linkProcess = new Process('link')

const Treshold = 50

linkProcess.work = function (room) {
  if (!room._my_) return

  const allLinks = _.filter(room.links, _.property('isActiveSimple'))

  if (allLinks.length === 0) {
    return
  }

  const sources = []
  const destinations = []

  const useAsSource = function (someLink) {
    return someLink.cooldown === 0 && someLink.store.getUsedCapacity(RESOURCE_ENERGY) > 0
  }

  const useAsDest = function (someLink) {
    // cut off transfer, due to losses it is never 100% full
    return someLink.store.getFreeCapacity(RESOURCE_ENERGY) > Treshold
  }

  for (const link of allLinks) {
    // quick flag, source keeps to be source
    if (link.isSource()) {
      if (useAsSource(link)) {
        sources.push(link)
      }
    } else {
      if (useAsDest(link)) {
        destinations.push(link)
      }
    }
  }

  if (sources.length === 0 || destinations.length === 0) {
    return
  }

  sources.sort(
    function (l1, l2) {
      // STRATEGY most energy first
      return l2.store[RESOURCE_ENERGY] - l1.store[RESOURCE_ENERGY]
    }
  )

  if (destinations.length > 1) {
    const workers = room.getRoomControlledWorkers()
    if (workers.length > 0) {
      for (const destination of destinations) {
        for (const worker of workers) {
          const distance = destination.pos.manhattanDistance(worker.pos)
          const proximity = 50 - distance
          const proximityNow = destination.__process_link_proximity ?? 0
          destination.__process_link_proximity = proximityNow + proximity
        }
      }
    }
  }

  destinations.sort(
    function (l1, l2) {
      const proxL1 = l1.__process_link_proximity ?? 0
      const proxL2 = l2.__process_link_proximity ?? 0

      if (proxL1 === proxL2) {
        // STRATEGY tie break - least energy
        return l1.store[RESOURCE_ENERGY] - l2.store[RESOURCE_ENERGY]
      }

      // STRATEGY link closest to worker clusters
      return proxL2 - proxL1
    }
  )

  let destinationIndex = 0
  for (const source of sources) {
    const destination = destinations[destinationIndex]

    source.transferEnergy(destination)

    ++destinationIndex
    if (destinationIndex >= destinations.length) {
      destinationIndex = 0
    }
  }
}

linkProcess.register()

module.exports = linkProcess
