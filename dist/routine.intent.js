'use strict'

const globals = require('globals')

if (UPGRADE_CONTROLLER_POWER != 1) {
  console.log('UPGRADE_CONTROLLER_POWER is no longer equal to 1, update intent code')
}

// made up value that is used as boundary for "limitless" operations
const MadeUpLargeNumber = 1000000

const intent =
{
  getUsedCapacity: function (something, type) {
    const propertyKey = '__stored_' + type
    const delta = something[propertyKey] || 0
    return something.store.getUsedCapacity(type) + delta
  },

  getFreeCapacity: function (something, type) {
    // detect non-universal store
    const nonUniversal = something.__non_universal_store || something.store.getCapacity() == null
    something.__non_universal_store = nonUniversal

    const propertyKey = nonUniversal ? ('__free_' + type) : '__free_universal'
    const delta = something[propertyKey] || 0
    return something.store.getFreeCapacity(type) + delta
  },

  // positive amount is increase in stored
  // negative amount is decrease in stored
  intentCapacityChange: function (something, type, amount) {
    // detect non-universal store
    const nonUniversal = something.__non_universal_store || something.store.getCapacity() == null
    something.__non_universal_store = nonUniversal

    const propertyKeyUsed = '__stored_' + type
    const propertyKeyFree = nonUniversal ? ('__free_' + type) : '__free_universal'

    const used = something[propertyKeyUsed] || 0
    const free = something[propertyKeyFree] || 0

    something[propertyKeyUsed] = used + amount
    something[propertyKeyFree] = free - amount
  },

  exchangeImpl: function (source, target, type, noLessThan, amount) {
    if (!_.contains(RESOURCES_ALL, type)) {
      console.log('exchangeImpl received invalid argument [type] of value [' + type + ']')
      return globals.ERR_INVALID_INTENT_ARG
    }

    if (amount && amount <= 0) {
      console.log('exchangeImpl received invalid argument [amount] of value [' + amount + ']')
      return globals.ERR_INVALID_INTENT_ARG
    }

    const sourceHas = this.getUsedCapacity(source, type)
    if (sourceHas <= 0) {
      return globals.ERR_INTENDEE_EXHAUSTED
    }

    // for https://github.com/screeps/engine/blob/78631905d975700d02786d9b666b9f97b1f6f8f9/src/processor/intents/creeps/transfer.js#L12
    if (noLessThan == true && amount && amount > sourceHas) {
      return globals.ERR_INTENDEE_EXHAUSTED
    }
    const sourceOut = amount || sourceHas

    const targetFree = this.getFreeCapacity(target, type)
    if (targetFree <= 0) {
      return globals.ERR_INTENDED_EXHAUSTED
    }

    const exchange = Math.min(sourceOut, targetFree)

    this.intentCapacityChange(source, type, -1 * exchange)
    this.intentCapacityChange(target, type, exchange)

    let rc = OK

    if (exchange >= sourceHas) rc = globals.WARN_LAST_INTENT
    if (exchange >= targetFree) rc = globals.WARN_LAST_INTENT

    return rc
  },

  creep_intent_build: function (creep, target) {
    if (target === undefined) {
      console.log('creep_intent_build received undefined argument [target]')
      return globals.ERR_INVALID_INTENT_ARG
    }

    const energy = this.getUsedCapacity(creep, RESOURCE_ENERGY)
    if (energy <= 0) {
      return globals.ERR_INTENDEE_EXHAUSTED
    }

    const progress = target.__progress || target.progress
    if (progress >= target.progressTotal) {
      return globals.ERR_INTENDED_EXHAUSTED
    }
    const remainingProgress = target.progressTotal - progress

    const possibleProgress = creep.getActiveBodyparts(WORK) * BUILD_POWER

    const actualProgress = Math.min(energy, remainingProgress, possibleProgress)

    this.intentCapacityChange(creep, RESOURCE_ENERGY, -1 * actualProgress)
    target.__progress = progress + actualProgress

    let rc = OK

    if (actualProgress >= energy) rc = globals.WARN_LAST_INTENT
    if (actualProgress >= remainingProgress) rc = globals.WARN_LAST_INTENT

    return rc
  },

  creep_intent_harvest: function (creep, target) {
    if (target === undefined) {
      console.log('creep_intent_harvest received undefined argument [target]')
      return globals.ERR_INVALID_INTENT_ARG
    }

    // harvest power per WORK for target
    // remaining amount in game state
    // harvested resource type

    let power1
    let amount
    let what

    if (target.energyCapacity) {
      power1 = HARVEST_POWER
      amount = target.__amount || target.energy
      what = RESOURCE_ENERGY
    } else if (target.mineralType) {
      power1 = HARVEST_MINERAL_POWER
      amount = target.__amount || target.mineralAmount
      what = target.mineralType
    } else if (target.depositType) {
      power1 = HARVEST_DEPOSIT_POWER
      amount = target.__amount || MadeUpLargeNumber
      what = target.depositType
    } else {
      console.log('intentSlurpImpl received unidentified target ' + JSON.stringify(target))
      return ERR_INVALID_TARGET
    }

    if (amount <= 0) {
      return globals.ERR_INTENDED_EXHAUSTED
    }

    const power = creep.getActiveBodyparts(WORK) * power1

    const toBeHarvested = Math.min(amount, power)

    let rc = OK

    // if creep was designed to carry anything at all, check remaining store
    if (_.some(creep.body, _.matchesProperty('type', CARRY))) {
      const freeCapacity = this.getFreeCapacity(creep, what)
      if (freeCapacity <= 0) {
        return globals.ERR_INTENDEE_EXHAUSTED
      }

      const toBeStored = Math.min(toBeHarvested, freeCapacity)
      this.intentCapacityChange(creep, what, toBeStored)

      // if capacity left is less or equal to intent, then this is last harvest before full
      if (freeCapacity <= toBeHarvested) rc = globals.WARN_LAST_INTENT
    }

    target.__amount = amount - toBeHarvested

    return rc
  },

  creep_intent_pickup: function (creep, target) {
    if (target === undefined) {
      console.log('creep_intent_pickup received undefined argument [target]')
      return globals.ERR_INVALID_INTENT_ARG
    }

    const amount = target.__amount || target.amount
    if (amount <= 0) {
      return globals.ERR_INTENDED_EXHAUSTED
    }
    const type = target.resourceType

    const canPick = this.getFreeCapacity(creep, type)
    if (canPick <= 0) {
      return globals.ERR_INTENDEE_EXHAUSTED
    }

    const exchange = Math.min(amount, canPick)

    this.intentCapacityChange(creep, type, exchange)
    target.__amount = amount - exchange

    let rc = OK

    if (exchange >= canPick) rc = globals.WARN_LAST_INTENT
    if (exchange >= amount) rc = globals.WARN_LAST_INTENT

    return rc
  },

  creep_intent_repair: function (creep, target, targetHits) {
    if (target === undefined) {
      console.log('creep_intent_repair received undefined argument [target]')
      return globals.ERR_INVALID_INTENT_ARG
    }

    const energy = this.getUsedCapacity(creep, RESOURCE_ENERGY)
    if (energy <= 0) {
      return globals.ERR_INTENDEE_EXHAUSTED
    }

    let wantHits = targetHits || target.hitsMax
    if (wantHits > target.hitsMax) wantHits = target.hitsMax

    const hits = target.__hits || target.hits
    if (hits >= wantHits) {
      return globals.ERR_INTENDED_EXHAUSTED
    }

    // https://github.com/screeps/engine/blob/78631905d975700d02786d9b666b9f97b1f6f8f9/src/processor/intents/creeps/repair.js#L23
    const repairPower = creep.getActiveBodyparts(WORK) * REPAIR_POWER
    const repairEnergyRemaining = energy / REPAIR_COST
    const repairHitsMax = target.hitsMax - hits
    const repairEffect = Math.min(repairPower, repairEnergyRemaining, repairHitsMax)
    const repairCost = Math.min(energy, Math.ceil(repairEffect * REPAIR_COST))

    this.intentCapacityChange(creep, RESOURCE_ENERGY, -1 * repairCost)
    target.__hits = hits + repairEffect

    let rc = OK

    if (repairCost >= energy) rc = globals.WARN_LAST_INTENT
    if (target.__hits >= wantHits) rc = globals.WARN_LAST_INTENT

    return rc
  },

  creep_intent_transfer: function (creep, target, type, amount) {
    if (target === undefined) {
      console.log('creep_intent_transfer received undefined argument [target]')
      return globals.ERR_INVALID_INTENT_ARG
    }

    return this.exchangeImpl(creep, target, type, true, amount)
  },

  creep_intent_upgradeController: function (creep, target, targetTicksToDowngrade) {
    if (target === undefined) {
      console.log('creep_intent_upgradeController received undefined argument [target]')
      return globals.ERR_INVALID_INTENT_ARG
    }

    const energy = this.getUsedCapacity(creep, RESOURCE_ENERGY)
    if (energy <= 0) {
      return globals.ERR_INTENDEE_EXHAUSTED
    }

    // no matter what goals creep has, update will not count
    const upgrades = target.__upgrades || 0
    if (target.level == 8 && upgrades >= CONTROLLER_MAX_UPGRADE_PER_TICK) {
      return globals.ERR_INTENDED_EXHAUSTED
    }
    const remainingUpgrades = target.level == 8 ? (CONTROLLER_MAX_UPGRADE_PER_TICK - upgrades) : MadeUpLargeNumber

    // if specific goal was set
    const ticks = target.__ticks || target.ticksToDowngrade
    if (targetTicksToDowngrade && ticks >= targetTicksToDowngrade) {
      return globals.ERR_INTENDED_EXHAUSTED
    }

    const possibleUpgrades = creep.getActiveBodyparts(WORK)

    const actualUpgrades = Math.min(energy, remainingUpgrades, possibleUpgrades)

    this.intentCapacityChange(creep, RESOURCE_ENERGY, -1 * actualUpgrades)
    target.__upgrades = upgrades + actualUpgrades
    target.__ticks = ticks + (upgrades == 0 ? CONTROLLER_DOWNGRADE_RESTORE : 0) // fixed amount per tick

    let rc = OK

    if (actualUpgrades >= energy) rc = globals.WARN_LAST_INTENT
    if (actualUpgrades >= remainingUpgrades) rc = globals.WARN_LAST_INTENT

    if (targetTicksToDowngrade && target.__ticks >= targetTicksToDowngrade) rc = globals.WARN_LAST_INTENT

    return rc
  },

  creep_intent_withdraw: function (creep, target, type, amount) {
    if (target === undefined) {
      console.log('creep_intent_withdraw received undefined argument [target]')
      return globals.ERR_INVALID_INTENT_ARG
    }

    return this.exchangeImpl(target, creep, type, false, amount)
  },

  wrapCreepIntent: function (creep, intentName, arg0 = undefined, arg1 = undefined, arg2 = undefined) {
    if (creep === undefined) {
      console.log('wrapCreepIntent received undefined argument [creep]')
      return globals.ERR_INVALID_INTENT_ARG
    }

    const intent = creep[intentName]
    if (intent === undefined) {
      console.log('Invalid intent [' + intentName + '] called for creep [' + creep.name + ']')
      return globals.ERR_INVALID_INTENT_NAME
    }

    let rc = OK

    const validator = this['creep_intent_' + intentName]
    if (validator) {
      rc = _.bind(validator, this)(creep, arg0, arg1, arg2)
      if (rc < OK) return rc // OK is 0, warnings are greater than zero
    } else {
      console.log('Unvalidated intent [' + intentName + '] called for creep [' + creep.name + ']')
    }

    const intentRc = _.bind(intent, creep)(arg0, arg1, arg2)
    if (intentRc != OK) {
      console.log('Unforceen error occurred during intent call [' + intentName +
                        '] on creep [' + creep.name +
                        '] with code ' + intentRc + ' where expected code was ' + rc)
      return intentRc
    }

    return rc
  }
}

module.exports = intent
