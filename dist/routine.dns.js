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

const fixedDemand = function (__type, __amount, priority) {
  const demand =
  {
    __type,
    __amount,
    priority,

    amount: function (type) {
      return this.__type === type ? this.__amount : 0
    }
  }

  return demand
}

const fixedSupply = fixedDemand

const simpleDemand = function (something, type, priority) {
  const freeForType = intentSolver.getFreeCapacity(something, type)

  if (freeForType <= 0) return noDemand

  return fixedDemand(type, freeForType, priority)
}

const supplyWithReserve = function (something, type, reserve, priority) {
  const usedByType = intentSolver.getUsedCapacity(something, type)

  if (usedByType <= reserve) return noSupply

  return fixedSupply(type, usedByType - reserve, priority)
}

const simpleSupply = function (something, type, priority) {
  return supplyWithReserve(something, type, 0, priority)
}

const storageDemand = function (__storage, priority) {
  const demand =
  {
    __storage,
    priority,

    amount: function (type) {
      const freeForType = intentSolver.getFreeCapacity(this.__storage, type)

      if (RESOURCE_ENERGY === type) return freeForType

      const reserveForEnergy = this.__storage.room.memory.stre || 0
      const freeForTypeNotEnergy = freeForType - reserveForEnergy
      if (freeForTypeNotEnergy <= 0) return 0

      return freeForTypeNotEnergy
    }
  }

  return demand
}

const storageSupply = function (storage, priority) {
  const energyReserve = storage.room.memory.stre || 0
  return supplyWithReserve(storage, RESOURCE_ENERGY, energyReserve, priority)
}

// STRATEGY terminal energy reserve for transfer of minerals
const TerminalEnergyRatio = 0.1
const TerminalMineralRatio = 1.0 - TerminalEnergyRatio

const terminalDemand = function (__terminal, priority) {
  const demand =
  {
    __terminal,
    priority,

    __amount_RESOURCE_ENERGY: function () {
      const energyReserve = this.__terminal.room.memory.trme || 0

      const usedByAll = intentSolver.getUsedCapacity(this.__terminal)
      const usedByEnergy = intentSolver.getUsedCapacity(this.__terminal, RESOURCE_ENERGY)

      const usedByNotEnergy = usedByAll - usedByEnergy      
      const energyForTransfer = Math.floor(TerminalEnergyRatio * usedByNotEnergy)

      const wantEnergy = energyReserve + energyForTransfer

      const delta = wantEnergy - usedByEnergy
      if (delta <= 0) return 0

      return delta
    },

    __amount_OTHER: function () {
      const energyReserve = this.__terminal.room.memory.trme || 0

      const freeForAll = intentSolver.getFreeCapacity(this.__terminal)
      const freeForMineral = Math.floor(TerminalMineralRatio * freeForAll)

      const delta = freeForMineral - energyReserve
      if (delta <= 0) return 0

      return delta
    },

    amount: function (type) {
      return RESOURCE_ENERGY === type ? this.__amount_RESOURCE_ENERGY() : this.__amount_OTHER()
    }
  }

  return demand
}

const terminalSupply = function (terminal, priority) {
  return noSupply
}

// STRATEGY tower restock priorities
const towerDemand = function (tower, priorityLow, priorityMedium, priorityHigh) {
  const amount = intentSolver.getFreeCapacity(tower, RESOURCE_ENERGY)

  if (amount <= 0) {
    return noDemand
  }

  let priority
  if (amount <= 50) {
    priority = priorityLow
  } else if (amount <= Math.floor(0.75 * TOWER_CAPACITY)) {
    priority = priorityMedium
  } else {
    priority = priorityHigh
  }

  return fixedDemand(RESOURCE_ENERGY, amount, priority)
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
