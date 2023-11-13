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

const fixedDemand2 = function (__type1, __amount1, __type2, __amount2, priority) {
  const demand =
  {
    __type1,
    __amount1,
    __type2,
    __amount2,
    priority,

    amount: function (type) {
      if (this.__type1 === type) return this.__amount1
      if (this.__type2 === type) return this.__amount2
      return 0
    }
  }

  return demand
}

const fixedSupply = fixedDemand

const singleTypeDemand = function (something, type, priority) {
  const freeForType = intentSolver.getFreeCapacity(something, type)
  if (freeForType <= 0) return noDemand
  return fixedDemand(type, freeForType, priority)
}

const singleTypeSupply = function (something, type, priority) {
  const usedByType = intentSolver.getUsedCapacity(something, type)
  if (usedByType <= 0) return noSupply
  return fixedSupply(type, usedByType, priority)
}

const singleTypeAndEnergyDemand = function (something, type, priority) {
  const freeForType = intentSolver.getFreeCapacity(something, type)
  const freeForEnergy = intentSolver.getFreeCapacity(something, RESOURCE_ENERGY)
  if (freeForType <= 0 && freeForEnergy <= 0) return noDemand
  return fixedDemand2(type, freeForType, RESOURCE_ENERGY, freeForEnergy, priority)
}

const allTypesSupply = function (__something, priority) {
  const supply =
  {
    __something,
    priority,

    amount: function (type) {
      const usedByType = intentSolver.getUsedCapacity(this.__something, type)
      if (usedByType <= 0) return 0
      return usedByType
    }
  }

  return supply
}

const storageDemand = function (__storage, priority) {
  const demand =
  {
    __storage,
    priority,

    amount: function (type) {
      const freeForTypeBeforeReserve = intentSolver.getFreeCapacity(this.__storage, type)

      const usedByEnergy = intentSolver.getUsedCapacity(this.__storage, RESOURCE_ENERGY)
      // TODO move value outside of specific function
      // TODO do not fill space reserved for energy even this space it is not needed
      // TODO allow to stash more energy than needed
      const neededEnergy = this.__storage.room.memory.stre || 0
      const missingEnergy = Math.max(neededEnergy - usedByEnergy, 0)

      if (RESOURCE_ENERGY === type) {
        return Math.min(missingEnergy, freeForTypeBeforeReserve)
      }

      const freeForTypeAfterReserve = freeForTypeBeforeReserve - missingEnergy
      if (freeForTypeAfterReserve <= 0) return 0
      return freeForTypeAfterReserve
    }
  }

  return demand
}

const storageSupply = function (__storage, priority) {
  const supply = {
    __storage,
    priority,

    amount: function (type) {
      if (RESOURCE_ENERGY !== type) {
        const usedByType = intentSolver.getUsedCapacity(this.__storage, type)
        if (usedByType <= 0) return 0
        return usedByType
      }

      const usedByEnergy = intentSolver.getUsedCapacity(this.__storage, RESOURCE_ENERGY)
      if (usedByEnergy <= 0) return 0

      const neededEnergy = this.__storage.room.memory.stre || 0

      const freeEnergy = usedByEnergy - neededEnergy
      if (freeEnergy <= 0) return 0
      return freeEnergy
    }
  }

  return supply
}

// STRATEGY terminal energy reserve for transfer of minerals
const TerminalEnergyRatio = 0.1
const TerminalMineralCapacity = Math.floor(TERMINAL_CAPACITY * (1.0 - TerminalEnergyRatio))

const roundUpToNearestMultiple = function (value, roundTo) {
  return Math.ceil(value / roundTo) * roundTo
}

const prognosisTerminalNeedEnergy = function (usedByNotEnergy) {
  if (usedByNotEnergy <= 0) return 0
  const prognosisUsedByNotEnergy = roundUpToNearestMultiple(usedByNotEnergy, 10000)
  return Math.floor(prognosisUsedByNotEnergy * TerminalEnergyRatio)
}

const terminalDemand = function (__terminal, priority) {
  const demand =
  {
    __terminal,
    priority,

    amount: function (type) {
      // sanity check before calculations below
      const freeCapacity = intentSolver.getFreeCapacity(this.__terminal)
      if (freeCapacity <= 0) return 0

      const usedByAll = intentSolver.getUsedCapacity(this.__terminal)
      const usedByEnergy = intentSolver.getUsedCapacity(this.__terminal, RESOURCE_ENERGY)
      const usedByNotEnergy = usedByAll - usedByEnergy

      if (RESOURCE_ENERGY === type) {
        const neededEnergy = prognosisTerminalNeedEnergy(usedByNotEnergy)
        const missingEnergy = neededEnergy - usedByEnergy
        if (missingEnergy <= 0) return 0
        return Math.min(missingEnergy, freeCapacity)
      }

      const freeForMineral = TerminalMineralCapacity - usedByNotEnergy
      if (freeForMineral <= 0) return 0
      return Math.min(freeForMineral, freeCapacity)
    }
  }

  return demand
}

const terminalSupply = function (__terminal, priority) {
  const supply = {
    __terminal,
    priority,

    amount: function (type) {
      if (RESOURCE_ENERGY !== type) {
        const usedByType = intentSolver.getUsedCapacity(this.__terminal, type)
        if (usedByType <= 0) return 0
        return usedByType
      }

      const usedByEnergy = intentSolver.getUsedCapacity(this.__terminal, RESOURCE_ENERGY)
      if (usedByEnergy <= 0) return 0

      const usedByAll = intentSolver.getUsedCapacity(this.__terminal)
      const usedByNotEnergy = usedByAll - usedByEnergy
      const neededEnergy = prognosisTerminalNeedEnergy(usedByNotEnergy)

      const freeEnergy = usedByEnergy - neededEnergy
      if (freeEnergy <= 0) return 0
      return freeEnergy
    }
  }

  return supply
}

// STRATEGY tower restock priorities
const towerDemand = function (tower, priorityLow, priorityMedium, priorityHigh) {
  const amount = intentSolver.getFreeCapacity(tower, RESOURCE_ENERGY)

  if (amount <= 0) {
    return noDemand
  }

  let priority
  if (amount < CARRY_CAPACITY) {
    priority = priorityLow
  } else if (amount <= Math.floor(0.75 * TOWER_CAPACITY)) {
    priority = priorityMedium
  } else {
    priority = priorityHigh
  }

  return fixedDemand(RESOURCE_ENERGY, amount, priority)
}

const getDemandFromIntent = function (something, tickFunction) {
  return intentSolver.getDemand(something, tickFunction)
}

const getSupplyFromIntent = function (something, tickFunction) {
  return intentSolver.getSupply(something, tickFunction)
}

const energyDemand = function (something, priority) {
  const tickFunction = _.bind(singleTypeDemand, null, something, RESOURCE_ENERGY, priority)
  return getDemandFromIntent(something, tickFunction)
}

const energyAndResourceDemand = function (something, type, priority) {
  const tickFunction = _.bind(singleTypeAndEnergyDemand, null, something, type, priority)
  return getDemandFromIntent(something, tickFunction)
}

const energySupply = function (something, priority) {
  const tickFunction = _.bind(singleTypeSupply, null, something, RESOURCE_ENERGY, priority)
  return getSupplyFromIntent(something, tickFunction)
}

const energySupply_isSource_false = function (something, priority) {
  if (something.__supply_cache_x) return something.__supply_cache_x

  if (something.isSource()) {
    something.__supply_cache_x = noSupply
    return something.__supply_cache_x
  }

  return energySupply(something, priority)
}

const allSupply = function (something, priority) {
  const tickFunction = _.bind(allTypesSupply, null, something, priority)
  return getSupplyFromIntent(something, tickFunction)
}

const Rank1High = 5
const Rank1Middle = 15
const Rank1Low = 25
const Rank2Middle = 75
const RankPassiveStorage = 1000

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
  'demand',
  {
    get: function () {
      return energyDemand(this, RankPassiveStorage + 1)
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
      return allSupply(this, Rank1Middle)
    },
    configurable: true,
    enumerable: true
  }
)

// StructureExtension.demand is executed overwhelmingly more often than the other non-const .demand
// For this reason it is optimized for speed instead of structure

// cache an object used by demand
Object.defineProperty(
  StructureExtension.prototype,
  '__demand_cache_x',
  {
    value:
    {
      __amount: 0,
      priority: null,

      amount: function (type) {
        return RESOURCE_ENERGY === type ? this.__amount : 0
      }
    },
    writable: true,
    enumerable: false
  }
)

// speed-calculate free space with intent, without long-haul cache getter
const __FreeResourceEnergyKey = '__free_' + RESOURCE_ENERGY
Object.defineProperty(
  StructureExtension.prototype,
  'demand',
  {
    get: function () {
      const amount = (this.__intents ? this.__intents[__FreeResourceEnergyKey] : undefined) || this.store.getFreeCapacity(RESOURCE_ENERGY)
      const greaterThanZero = amount > 0

      this.__demand_cache_x.__amount = greaterThanZero ? amount : 0
      this.__demand_cache_x.priority = greaterThanZero ? Rank1Middle : null

      return this.__demand_cache_x
    },
    configurable: true,
    enumerable: true
  }
)

Object.defineProperty(
  StructureLink.prototype,
  'demand',
  {
    get: function () {
      return energyDemandSource(this, RankPassiveStorage)
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
      return energySupply_isSource_false(this, Rank1Middle)
    },
    configurable: true,
    enumerable: true
  }
)

Object.defineProperty(
  StructureNuker.prototype,
  'demand',
  {
    get: function () {
      return energyAndResourceDemand(this, RESOURCE_GHODIUM, Rank2Middle)
    },
    configurable: true,
    enumerable: true
  }
)

Object.defineProperty(
  StructurePowerSpawn.prototype,
  'demand',
  {
    get: function () {
      return energyAndResourceDemand(this, RESOURCE_POWER, Rank2Middle)
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
      return energyDemand(this, Rank1Middle)
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
      const tickFunction = _.bind(storageDemand, null, this, Rank2Middle + 1)
      return getDemandFromIntent(this, tickFunction)
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
      const tickFunction = _.bind(storageSupply, null, this, Rank1Middle)
      return getSupplyFromIntent(this, tickFunction)
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
      const tickFunction = _.bind(terminalDemand, null, this, Rank2Middle)
      return getDemandFromIntent(this, tickFunction)
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
      const tickFunction = _.bind(terminalSupply, null, this, Rank1Middle)
      return getSupplyFromIntent(this, tickFunction)
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
      const tickFunction = _.bind(towerDemand, null, this, Rank1Low, Rank1Middle, Rank1High)
      return getDemandFromIntent(this, tickFunction)
    },
    configurable: true,
    enumerable: true
  }
)
