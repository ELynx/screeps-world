'use strict'

const bootstrap = require('./bootstrap')

if (UPGRADE_CONTROLLER_POWER !== 1) {
  console.log('UPGRADE_CONTROLLER_POWER is not equal to 1')
}

// made up value that is used as boundary for "limitless" operations
const MadeUpLargeNumber = 1000000

const intent = {
  getWithIntended: function (something, key, tickValue) {
    if (something.__intents) {
      return tickValue + (something.__intents[key] || 0)
    }
    return tickValue
  },

  addIntended: function (something, key, intentValue) {
    if (something.__intents === undefined) {
      something.__intents = { }
    }
    const now = something.__intents[key] || 0
    const after = now + intentValue
    something.__intents[key] = after
  },

  subIntended: function (something, key, intentValue) {
    this.addIntended(something, key, -1 * intentValue)
  },

  /**
   * Internal use, type is always defined
   **/
  _getUsedCapacity: function (something, type) {
    const key = '__stored_' + type
    const value = something.store.getUsedCapacity(type)
    return this.getWithIntended(something, key, value)
  },

  __getFreeCapacity: function (something, type, nonUniversal) {
    const key = nonUniversal ? ('__free_' + type) : '__free_total'
    const value = nonUniversal ? something.store.getFreeCapacity(type) : something.store.getFreeCapacity()
    return this.getWithIntended(something, key, value)
  },

  /**
   * Internal use, type is always defined
   **/
  _getFreeCapacity: function (something, type) {
    const nonUniversal = something.store.getCapacity() === null
    return this.__getFreeCapacity(something, type, nonUniversal)
  },

  /**
   * Something to plant intent on
   * {type} is always defined here, because this is transfer for concrete result
   * {amount} positive to increment value on something, negative to decrement
   **/
  intentCapacityChange: function (something, type, amount) {
    this.addIntended(something, '__stored_' + type, amount)
    this.addIntended(something, '__stored_total', amount)
    this.subIntended(something, '__free_' + type, amount)
    this.subIntended(something, '__free_total', amount)
  },

  exchangeImpl: function (source, target, type, noLessThan, amount) {
    if (!_.contains(RESOURCES_ALL, type)) {
      console.log('exchangeImpl received invalid argument [type] of value [' + type + ']')
      return bootstrap.ERR_INVALID_INTENT_ARG
    }

    if (amount && amount <= 0) {
      console.log('exchangeImpl received invalid argument [amount] of value [' + amount + ']')
      return bootstrap.ERR_INVALID_INTENT_ARG
    }

    const sourceHas = this._getUsedCapacity(source, type)
    if (sourceHas <= 0) {
      return bootstrap.ERR_INTENDEE_EXHAUSTED
    }

    // for https://github.com/screeps/engine/blob/78631905d975700d02786d9b666b9f97b1f6f8f9/src/processor/intents/creeps/transfer.js#L12
    if (noLessThan === true && amount && amount > sourceHas) {
      return bootstrap.ERR_INTENDEE_EXHAUSTED
    }
    const sourceOut = amount || sourceHas

    const targetFree = this._getFreeCapacity(target, type)
    if (targetFree <= 0) {
      return bootstrap.ERR_INTENDED_EXHAUSTED
    }

    const exchange = Math.min(sourceOut, targetFree)

    this.intentCapacityChange(source, type, -1 * exchange)
    this.intentCapacityChange(target, type, exchange)

    let rc = OK

    if (exchange >= sourceHas) rc += bootstrap.WARN_INTENDEE_EXHAUSTED
    if (exchange >= targetFree) rc += bootstrap.WARN_INTENDED_EXHAUSTED

    return rc
  },

  creep_intent_build: function (creep, target) {
    if (target === undefined) {
      console.log('creep_intent_build received undefined argument [target]')
      return bootstrap.ERR_INVALID_INTENT_ARG
    }

    const energy = this._getUsedCapacity(creep, RESOURCE_ENERGY)
    if (energy <= 0) {
      return bootstrap.ERR_INTENDEE_EXHAUSTED
    }

    const key = '__progress'

    const progress = this.getWithIntended(target, key, target.progress)
    if (progress >= target.progressTotal) {
      return bootstrap.ERR_INTENDED_EXHAUSTED
    }
    const remainingProgress = target.progressTotal - progress

    const possibleProgress = creep.getActiveBodyparts(WORK) * BUILD_POWER

    const actualProgress = Math.min(energy, remainingProgress, possibleProgress)

    this.intentCapacityChange(creep, RESOURCE_ENERGY, -1 * actualProgress)
    this.addIntended(target, key, actualProgress)

    let rc = OK

    if (actualProgress >= energy) rc += bootstrap.WARN_INTENDEE_EXHAUSTED
    if (actualProgress >= remainingProgress) rc += bootstrap.WARN_INTENDED_EXHAUSTED

    return rc
  },

  creep_intent_harvest: function (creep, target) {
    if (target === undefined) {
      console.log('creep_intent_harvest received undefined argument [target]')
      return bootstrap.ERR_INVALID_INTENT_ARG
    }

    const key = '__amount'

    // harvest power per WORK for target
    // remaining amount in game state
    // harvested resource type
    let power1
    let amount
    let what

    if (target.energyCapacity) {
      power1 = HARVEST_POWER
      amount = this.getWithIntended(target, key, target.energy)
      what = RESOURCE_ENERGY
    } else if (target.mineralType) {
      power1 = HARVEST_MINERAL_POWER
      amount = this.getWithIntended(target, key, target.mineralAmount)
      what = target.mineralType
    } else if (target.depositType) {
      power1 = HARVEST_DEPOSIT_POWER
      amount = this.getWithIntended(target, key, MadeUpLargeNumber)
      what = target.depositType
    } else {
      console.log('intentSlurpImpl received unidentified target ' + JSON.stringify(target))
      return ERR_INVALID_TARGET
    }

    if (amount <= 0) {
      return bootstrap.ERR_INTENDED_EXHAUSTED
    }

    const power = creep.getActiveBodyparts(WORK) * power1

    const toBeHarvested = Math.min(amount, power)

    let rc = OK

    // if creep was designed to carry anything at all, check remaining store
    if (_.some(creep.body, _.matchesProperty('type', CARRY))) {
      const freeCapacity = this._getFreeCapacity(creep, what)
      if (freeCapacity <= 0) {
        return bootstrap.ERR_INTENDEE_EXHAUSTED
      }

      const toBeStored = Math.min(toBeHarvested, freeCapacity)
      this.intentCapacityChange(creep, what, toBeStored)

      // if capacity left is less or equal to intent, then this is last harvest before full
      if (freeCapacity <= toBeHarvested) rc += bootstrap.WARN_INTENDEE_EXHAUSTED
    }

    this.subIntended(target, key, toBeHarvested)

    if (toBeHarvested >= amount) rc += bootstrap.WARN_INTENDED_EXHAUSTED

    return rc
  },

  creep_intent_pickup: function (creep, target) {
    if (target === undefined) {
      console.log('creep_intent_pickup received undefined argument [target]')
      return bootstrap.ERR_INVALID_INTENT_ARG
    }

    const key = '__amount'

    const amount = this.getWithIntended(target, key, target.amount)
    if (amount <= 0) {
      return bootstrap.ERR_INTENDED_EXHAUSTED
    }
    const type = target.resourceType

    const canPick = this._getFreeCapacity(creep, type)
    if (canPick <= 0) {
      return bootstrap.ERR_INTENDEE_EXHAUSTED
    }

    const exchange = Math.min(amount, canPick)

    this.intentCapacityChange(creep, type, exchange)
    this.subIntended(target, key, exchange)

    let rc = OK

    if (exchange >= canPick) rc += bootstrap.WARN_INTENDEE_EXHAUSTED
    if (exchange >= amount) rc += bootstrap.WARN_INTENDED_EXHAUSTED

    return rc
  },

  creep_intent_repair: function (creep, target, targetHits) {
    if (target === undefined) {
      console.log('creep_intent_repair received undefined argument [target]')
      return bootstrap.ERR_INVALID_INTENT_ARG
    }

    const energy = this._getUsedCapacity(creep, RESOURCE_ENERGY)
    if (energy <= 0) {
      return bootstrap.ERR_INTENDEE_EXHAUSTED
    }

    let wantHits = targetHits || target.hitsMax
    if (wantHits > target.hitsMax) wantHits = target.hitsMax

    const key = '__hits'

    const hits = this.getWithIntended(target, key, target.hits)
    if (hits >= wantHits) {
      return bootstrap.ERR_INTENDED_EXHAUSTED
    }

    // https://github.com/screeps/engine/blob/78631905d975700d02786d9b666b9f97b1f6f8f9/src/processor/intents/creeps/repair.js#L23
    const repairPower = creep.getActiveBodyparts(WORK) * REPAIR_POWER
    const repairEnergyRemaining = energy / REPAIR_COST
    const repairHitsMax = target.hitsMax - hits
    const repairEffect = Math.min(repairPower, repairEnergyRemaining, repairHitsMax)
    const repairCost = Math.min(energy, Math.ceil(repairEffect * REPAIR_COST))

    this.intentCapacityChange(creep, RESOURCE_ENERGY, -1 * repairCost)
    this.addIntended(target, key, repairEffect)

    let rc = OK

    if (repairCost >= energy) rc += bootstrap.WARN_INTENDEE_EXHAUSTED
    if (this.getWithIntended(target, key, target.hits) >= wantHits) rc += bootstrap.WARN_INTENDED_EXHAUSTED

    return rc
  },

  creep_intent_transfer: function (creep, target, type, amount) {
    if (target === undefined) {
      console.log('creep_intent_transfer received undefined argument [target]')
      return bootstrap.ERR_INVALID_INTENT_ARG
    }

    return this.exchangeImpl(creep, target, type, true, amount)
  },

  creep_intent_upgradeController: function (creep, target, targetTicksToDowngrade) {
    if (target === undefined) {
      console.log('creep_intent_upgradeController received undefined argument [target]')
      return bootstrap.ERR_INVALID_INTENT_ARG
    }

    const energy = this._getUsedCapacity(creep, RESOURCE_ENERGY)
    if (energy <= 0) {
      return bootstrap.ERR_INTENDEE_EXHAUSTED
    }

    const keyUpgrades = '__upgrades'
    const keyTicks = '__ticks'

    // no matter what goals creep has, update will not count
    const upgrades = this.getWithIntended(target, keyUpgrades, 0)
    if (target.level === 8 && upgrades >= CONTROLLER_MAX_UPGRADE_PER_TICK) {
      return bootstrap.ERR_INTENDED_EXHAUSTED
    }
    const remainingUpgrades = target.level === 8 ? (CONTROLLER_MAX_UPGRADE_PER_TICK - upgrades) : MadeUpLargeNumber

    // if specific goal was set
    const ticks = this.getWithIntended(target, keyTicks, target.ticksToDowngrade)
    if (targetTicksToDowngrade && ticks >= targetTicksToDowngrade) {
      return bootstrap.ERR_INTENDED_EXHAUSTED
    }

    const possibleUpgrades = creep.getActiveBodyparts(WORK)

    const actualUpgrades = Math.min(energy, remainingUpgrades, possibleUpgrades)

    this.intentCapacityChange(creep, RESOURCE_ENERGY, -1 * actualUpgrades)
    this.addIntended(target, keyUpgrades, actualUpgrades)
    // fixed amount per tick
    if (upgrades === 0) {
      this.addIntended(target, keyTicks, CONTROLLER_DOWNGRADE_RESTORE)
    }

    let rc = OK

    if (actualUpgrades >= energy) rc += bootstrap.WARN_INTENDEE_EXHAUSTED

    let intendedExhaused = false

    if (actualUpgrades >= remainingUpgrades) intendedExhaused = true

    if (targetTicksToDowngrade) {
      if (this.getWithIntended(target, keyTicks, target.ticksToDowngrade) >= targetTicksToDowngrade) {
        intendedExhaused = true
      }
    }

    if (intendedExhaused) rc += bootstrap.WARN_INTENDED_EXHAUSTED

    return rc
  },

  creep_intent_withdraw: function (creep, target, type, amount) {
    if (target === undefined) {
      console.log('creep_intent_withdraw received undefined argument [target]')
      return bootstrap.ERR_INVALID_INTENT_ARG
    }

    const rc = this.exchangeImpl(target, creep, type, false, amount)

    // accommodate for argument order switch
    if (rc === bootstrap.ERR_INTENDEE_EXHAUSTED) return bootstrap.ERR_INTENDED_EXHAUSTED
    if (rc === bootstrap.ERR_INTENDED_EXHAUSTED) return bootstrap.ERR_INTENDEE_EXHAUSTED
    if (rc === bootstrap.WARN_INTENDED_EXHAUSTED) return bootstrap.WARN_INTENDEE_EXHAUSTED
    if (rc === bootstrap.WARN_INTENDEE_EXHAUSTED) return bootstrap.WARN_INTENDED_EXHAUSTED

    return rc
  },

  backupIntents: function (something) {
    if (something && something.__intents) {
      return _.cloneDeep(something.__intents)
    }

    return undefined
  },

  restoreIntents: function (something, backup) {
    if (something && backup) {
      something.__intents = backup
    }
  },

  wrapCreepIntent: function (creep, intentName, arg0 = undefined, arg1 = undefined, arg2 = undefined) {
    if (creep === undefined) {
      console.log('wrapCreepIntent received undefined argument [creep]')
      return bootstrap.ERR_INVALID_INTENT_ARG
    }

    const intent = creep[intentName]
    if (intent === undefined) {
      console.log('Invalid intent [' + intentName + '] called for creep [' + creep.name + ']')
      return bootstrap.ERR_INVALID_INTENT_NAME
    }

    let rc = OK

    const backupCreep = this.backupIntents(creep)
    const backupArg0 = this.backupIntents(arg0)
    const backupArg1 = this.backupIntents(arg1)
    const backupArg2 = this.backupIntents(arg2)

    const intentHandler = this['creep_intent_' + intentName]
    if (intentHandler) {
      rc = _.bind(intentHandler, this)(creep, arg0, arg1, arg2)
      if (rc < OK) return rc // OK is 0, warnings are greater than zero
    } else {
      console.log('Unvalidated intent [' + intentName + '] called for creep [' + creep.name + ']')
    }

    const intentRc = _.bind(intent, creep)(arg0, arg1, arg2)
    if (intentRc !== OK) {
      console.log('Unforceen error occurred during intent call [' + intentName +
                        '] on creep [' + creep.name +
                        '] with code ' + intentRc + ' where expected code was ' + rc)

      this.restoreIntents(creep, backupCreep)
      this.restoreIntents(arg0, backupArg0)
      this.restoreIntents(arg1, backupArg1)
      this.restoreIntents(arg2, backupArg2)

      return intentRc
    }

    return rc
  },

  getFreeCapacity: function (something, type = undefined) {
    // repeat after original API
    const nonUniversal = something.store.getCapacity() === null
    if (nonUniversal && type === undefined) {
      return null
    }

    return this.__getFreeCapacity(something, type, nonUniversal)
  },

  getUsedCapacity: function (something, type = undefined) {
    // repeat after original API
    const nonUniversal = something.store.getCapacity() === null
    if (nonUniversal && type === undefined) {
      return null
    }

    if (type !== undefined) {
      return this._getUsedCapacity(something, type)
    }

    const key = '__stored_total'
    const value = something.store.getUsedCapacity()

    return this.getWithIntended(something, key, value)
  }
}

module.exports = intent
