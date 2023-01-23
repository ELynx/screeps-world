'use strict';

var globals = require('globals');

var intent =
{
    creep_intent_build: function(creep, target, arg1, arg2)
    {
        // check given arguments
        if (target === undefined)
        {
            console.log('creep_intent_build received undefined target');
            return globals.ERR_INVALID_INTENT_ARG;
        }

        const shadowStoredEnergy = creep.__stored_energy || creep.store.getUsedCapacity(RESOURCE_ENERGY);
        if (shadowStoredEnergy <= 0)
        {
            return globals.ERR_INTENDEE_EXHAUSTED;
        }

        const shadowRemains = target.__remains || (target.totalProgress - target.progress);
        if (shadowRemains <= 0)
        {
            return globals.ERR_INTENDED_EXHAUSTED;
        }

        const maxProgress = creep.getActiveBodyparts(WORK) * BUILD_POWER;
        const toBeProgressed = Math.min(shadowStoredEnergy, shadowRemains, maxProgress);

        let rc = OK;

        if (toBeProgressed >= shadowStoredEnergy) rc = globals.WARN_LAST_INTENT;
        if (toBeProgressed >= shadowRemains)      rc = globals.WARN_LAST_INTENT;

        creep.__stored_energy = shadowStoredEnergy - toBeProgressed;
        target.__remains      = shadowRemains      - toBeProgressed;

        return rc;
    },

    creep_intent_harvest: function(creep, target, arg1, arg2)
    {
        // check given arguments
        if (target === undefined)
        {
            console.log('creep_intent_harvest received undefined target');
            return globals.ERR_INVALID_INTENT_ARG;
        }

        // quick shadow checks
        if (creep.__space   && creep.__space <= 0)   return globals.ERR_INTENDEE_EXHAUSTED;
        if (target.__amount && target.__amount <= 0) return globals.ERR_INTENDED_EXHAUSTED;

        // harvest power per WORK for target type
        // remaining amount in tick space
        let power1 = undefined;
        let amount = undefined;

        if (target.energyCapacity)
        {
            power1 = HARVEST_POWER;
            amount = target.energy;
        }
        else if (target.mineralType)
        {
            power1 = HARVEST_MINERAL_POWER;
            amount = target.mineralAmount;
        }
        else if (target.depositType)
        {
            power1 = HARVEST_DEPOSIT_POWER;
            amount = 1000000; // made up value greater than single pick
        }
        else
        {
            console.log('creep_intent_harvest received invalid target ' + JSON.stringify(target));
            return ERR_INVALID_TARGET;
        }

        if (amount <= 0)
        {
            return globals.ERR_INTENDED_EXHAUSTED;
        }

        const shadowAmount = target.__amount || amount;
        const power = creep.getActiveBodyparts(WORK) * power1;
        const toBeHarvested = Math.min(shadowAmount, power);

        let rc = OK;

        // if creep was designed to carry anything at all, check remaining store
        const hasCarry = _.some(creep.body, _.matchesProperty('type', CARRY));
        if (hasCarry)
        {
            const space = creep.store.getFreeCapacity();
            if (space <= 0)
            {
                return globals.ERR_INTENDEE_EXHAUSTED;
            }

            const shadowSpace = creep.__space || space;

            // if space left is less or equal to intent, then this is last harvest before full
            if (shadowSpace <= toBeHarvested)
            {
                rc = globals.WARN_LAST_INTENT;
            }

            creep.__space = shadowSpace - toBeHarvested;
        }

        target.__amount = shadowAmount - toBeHarvested;

        return rc;
    },

    wrapCreepIntent: function(creep, intentName, arg0 = undefined, arg1 = undefined, arg2 = undefined)
    {
        const intent = creep[intentName];
        if (intent === undefined)
        {
            console.log('Invalid intent [' + intentName + '] called for creep [' + creep.name + ']');
            return globals.ERR_INVALID_INTENT_NAME;
        }

        let rc = OK;

        const validator = this['creep_intent_' + intentName];
        if (validator)
        {
            rc = _.bind(validator, this)(creep, arg0, arg1, arg2);
            if (rc < OK) return rc; // OK is 0, warnings are greater than zero
        }
        else
        {
            console.log('Unvalidated intent [' + intentName + '] called for creep [' + creep.name + ']');
        }

        let intentRc = undefined;
        const boundIntent = _.bind(intent, creep);
        if      (arg2 !== undefined) intentRc = boundIntent(arg0, arg1, arg2);
        else if (arg1 !== undefined) intentRc = boundIntent(arg0, arg1);
        else if (arg0 !== undefined) intentRc = boundIntent(arg0);
        else                         intentRc = boundIntent();

        if (intentRc != OK)
        {
            console.log('Unforceen error occurred during intent call [' + intentName +
                        '] on creep [' + creep.name +
                        '] with code ' + intentRc + ' where expected code was ' + rc);
            return intentRc;
        }

        return rc;
    }
};

module.exports = intent;
