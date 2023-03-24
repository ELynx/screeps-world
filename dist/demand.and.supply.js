'use strict'

const intentSolver = require('./routine.intent')

const noDemand =
{
  priority: null,

  amount: function () {
    return 0
  }
}

const noSupply = noDemand

const simpleDemand = function (something, type, priority) {
  const amount = intentSolver.getFreeCapacity(something, type)

  if (amount <= 0) {
    return noDemand
  }

  const demand =
  {
    priority,

    __type: type,
    __amount: amount,

    amount: function (type) {
      if (this.__type === type) return this.__amount
      return 0
    }
  }

  return demand
}

const supplyWithReserve = function (something, type, reserve, priority) {
  const amount = intentSolver.getUsedCapacity(something, type)

  if (amount <= reserve) {
    return noSupply
  }

  const supply =
  {
    priority,

    __type: type,
    __amount: (amount - reserve),

    amount: function (type) {
      if (this.__type === type) return this.__amount
      return 0
    }
  }

  return supply
}

const simpleSupply = function (something, type, priority) {
  return supplyWithReserve(something, type, 0, priority)
}

const universalStorageDemand = function (withStorage, energyReserve, priority) {
  const supply =
  {
    priority,

    __withStorage: withStorage,
    __energyReserve: energyReserve,

    amount: function (type) {
      const free = intentSolver.getFreeCapacity(this.__withStorage, type)

      if (RESOURCE_ENERGY === type) return free

      const want = free - this.__energyReserve
      if (want <= 0) return 0

      return want
    }
  }

  return supply
}

// STRATEGY tower restock priorities
const towerDemand = function (tower) {
  const free = intentSolver.getFreeCapacity(tower, RESOURCE_ENERGY)
  if (free <= 50) {
    return noDemand
  }

  let priority
  if (free > 0.75 * TOWER_CAPACITY) {
    priority = 5
  } else {
    priority = 10
  }

  const demand =
  {
    priority,

    __amount: free,

    amount: function (type) {
      if (RESOURCE_ENERGY === type) return this.__amount
      return 0
    }
  }

  return demand
}

Object.defineProperty(
  Structure.prototype,
  'demand',
  {
    value: noDemand,
    writable: false,
    enumerable: true
  }
)

Object.defineProperty(
  Structure.prototype,
  'supply',
  {
    value: noSupply,
    writable: false,
    enumerable: true
  }
)

Object.defineProperty(
  StructureContainer.prototype,
  'demand_restocker',
  {
    get: function () {
      if (this.__demand_cache_x) return this.__demand_cache_x

      if (!this.isSource()) {
        this.__demand_cache_x = noDemand
        return this.__demand_cache_x
      }

      return intentSolver.getWithIntentCache(
        this,
        '__demand_cache',
        _.bind(simpleDemand, null, this, RESOURCE_ENERGY, 11)
      )
    },
    configurable: true,
    enumerable: true
  }
)

Object.defineProperty(
  StructureContainer.prototype,
  'supply',
  {
    get: function () {
      return intentSolver.getWithIntentCache(
        this,
        '__supply_cache',
        _.bind(simpleSupply, null, this, RESOURCE_ENERGY, 11)
      )
    },
    configurable: true,
    enumerable: true
  }
)

Object.defineProperty(
  StructureExtension.prototype,
  'demand',
  {
    get: function () {
      return intentSolver.getWithIntentCache(
        this,
        '__demand_cache',
        _.bind(simpleDemand, null, this, RESOURCE_ENERGY, 11)
      )
    },
    configurable: true,
    enumerable: true
  }
)

Object.defineProperty(
  StructureLink.prototype,
  'demand_restocker',
  {
    get: function () {
      if (this.__demand_cache_x) return this.__demand_cache_x

      if (!this.isSource()) {
        this.__demand_cache_x = noDemand
        return this.__demand_cache_x
      }

      return intentSolver.getWithIntentCache(
        this,
        '__demand_cache',
        _.bind(simpleDemand, null, this, RESOURCE_ENERGY, 10)
      )
    },
    configurable: true,
    enumerable: true
  }
)

Object.defineProperty(
  StructureLink.prototype,
  'supply',
  {
    get: function () {
      if (this.__supply_cache_x) return this.__supply_cache_x

      if (this.isSource()) {
        this.__supply_cache_x = noSupply
        return this.__supply_cache_x
      }

      return intentSolver.getWithIntentCache(
        this,
        '__supply_cache',
        _.bind(simpleSupply, null, this, RESOURCE_ENERGY, 10)
      )
    },
    configurable: true,
    enumerable: true
  }
)

Object.defineProperty(
  StructureSpawn.prototype,
  'demand',
  {
    get: function () {
      return intentSolver.getWithIntentCache(
        this,
        '__demand_cache',
        _.bind(simpleDemand, null, this, RESOURCE_ENERGY, 10)
      )
    },
    configurable: true,
    enumerable: true
  }
)

Object.defineProperty(
  StructureStorage.prototype,
  'demand',
  {
    get: function () {
      return intentSolver.getWithIntentCache(
        this,
        '__demand_cache',
        _.bind(universalStorageDemand, null, this, 0, 52)
      )
    },
    configurable: true,
    enumerable: true
  }
)

Object.defineProperty(
  StructureStorage.prototype,
  'supply',
  {
    get: function () {
      return intentSolver.getWithIntentCache(
        this,
        '__supply_cache',
        _.bind(supplyWithReserve, null, this, RESOURCE_ENERGY, (this.room.stre || 0), 11)
      )
    },
    configurable: true,
    enumerable: true
  }
)

Object.defineProperty(
  StructureTerminal.prototype,
  'demand',
  {
    get: function () {
      return intentSolver.getWithIntentCache(
        this,
        '__demand_cache',
        _.bind(universalStorageDemand, null, this, 300, 51)
      )
    },
    configurable: true,
    enumerable: true
  }
)

Object.defineProperty(
  StructureTerminal.prototype,
  'supply',
  {
    get: function () {
      return intentSolver.getWithIntentCache(
        this,
        '__supply_cache',
        _.bind(supplyWithReserve, null, this, RESOURCE_ENERGY, (this.room.trme || 0), 11)
      )
    },
    configurable: true,
    enumerable: true
  }
)

Object.defineProperty(
  StructureTower.prototype,
  'demand',
  {
    get: function () {
      return intentSolver.getWithIntentCache(
        this,
        '__demand_cache',
        _.bind(towerDemand, null, this)
      )
    },
    configurable: true,
    enumerable: true
  }
)
