'use strict'

const intentSolver = require('./routine.intent')

const noDemand =
{
  priority: 99
}

const noSupply =
{
  priority: 99
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

const simpleSupply = function (something, type, priority) {
  const amount = intentSolver.getUsedCapacity(something, type)

  if (amount <= 0) {
    return noSupply
  }

  const supply =
  {
    priority,
    [type]: amount
  }

  return supply
}

const universalStoreSupply = function (something, priority) {
  const supply =
  {
    priority
  }

  const resourceTypes = _.keys(something.store)
  for (const resourceType of resourceTypes) {
    const amount = intentSolver.getUsedCapacity(something, resourceType)
    if (amount > 0) {
      supply[resourceType] = amount
    }
  }

  return supply
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
        return simpleDemand(this, RESOURCE_ENERGY, 0)
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
      return universalStoreSupply(this, 65)
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
      return simpleDemand(this, RESOURCE_ENERGY, 51)
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
        return simpleDemand(this, RESOURCE_ENERGY, 0)
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
        return simpleSupply(this, RESOURCE_ENERGY, 64)
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
      return simpleDemand(this, RESOURCE_ENERGY, 50)
    },
    configurable: true,
    enumerable: true
  }
)
