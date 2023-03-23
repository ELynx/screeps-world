'use strict'

const intentSolver = require('./routine.intent')

const noDemand =
{
  priority: null
}

const noSupply =
{
  priority: null
}

const simpleDemand = function (something, type, priority) {
  const amount = intentSolver.getFreeCapacity(something, type)

  if (amount <= 0) {
    return noDemand
  }

  const demand =
  {
    priority,
    [type]: amount
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
    [type]: (amount - reserve)
  }
}

const simpleSupply = function (something, type, priority) {
  return supplyWithReserve(something, type, 0, priority)
}

function UniversalStorageDemand (howMuchEnergyToKeep, priority) {

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
      if (this.isSource()) {
        return simpleDemand(this, RESOURCE_ENERGY, 11)
      } else {
        return noDemand
      }
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
      return simpleSupply(this, RESOURCE_ENERGY, 11)
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
      return simpleDemand(this, RESOURCE_ENERGY, 11)
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
      if (this.isSource()) {
        return simpleDemand(this, RESOURCE_ENERGY, 10)
      } else {
        return noDemand
      }
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
      if (this.isSource()) {
        return noSupply
      } else {
        return simpleSupply(this, RESOURCE_ENERGY, 10)
      }
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
      return simpleDemand(this, RESOURCE_ENERGY, 10)
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
      return noDemand
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
      const toKeep = this.room.stre || 0
      return supplyWithReserve(this, RESOURCE_ENERGY, toKeep, 11)
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
      return noDemand
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
      const toKeep = this.room.trme || 0
      return supplyWithReserve(this, RESOURCE_ENERGY, toKeep, 11)
    },
    configurable: true,
    enumerable: true
  }
)

// STRATEGY restock priorities
Object.defineProperty(
  StructureTower.prototype,
  'demand',
  {
    get: function () {
      const free = intentSolver.getFreeCapacity(this, RESOURCE_ENERGY)
      if (free <= 50) return noDemand

      let priority
      if (free > 0.75 * TOWER_CAPACITY) {
        priority = 5
      } else {
        priority = 10
      }

      const demand =
      {
        priority,
        [RESOURCE_ENERGY]: free
      }

      return demand
    },
    configurable: true,
    enumerable: true
  }
)
