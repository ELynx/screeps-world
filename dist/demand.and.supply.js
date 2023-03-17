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

  const demand =
  {
    priority,
    [type]: amount
  }

  return demand
}

const simpleSupply = function (something, type, priority) {
  const amount = intentSolver.getUsedCapacity(something, type)

  const supply =
  {
    priority,
    [type]: amount
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

Object.defineProperty(
  StructureExtension.prototype,
  'demand',
  {
    get: function () {
      return simpleDemand(this, RESOURCE_ENERGY, 50)
    },
    configurable: true,
    enumerable: true
  }
)
