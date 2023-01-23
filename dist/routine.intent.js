'use strict';

var intent =
{
    harvest: function(creep, target)
    {

    },

    wrapCreepIntent: function(creep, intentName, arg0 = undefined, arg1 = undefined, arg2 = undefined)
    {
        // hotfix
        if (intentName == 'harvest')
        {
            if (creep.store.getFreeCapacity() == 0) return ERR_FULL;
            if (creep.store.getFreeCapacity() <= creep.getActiveBodyparts(WORK) * HARVEST_POWER) return globals.WARN_LAST_INTENT;
        }

        const intent = creep[intentName];
        if (intent === undefined)
        {
            console.log('Invalid intent [' + intentName + '] called for creep [' + creep.name + ']');
            return globals.ERR_INVALID_INTENT_NAME;
        }

        const boundIntent = _.bind(intent, creep);

        let rc = globals.ERR_INVALID_INTENT_ARG;

        if      (arg2 !== undefined) rc = boundIntent(arg0, arg1, arg2);
        else if (arg1 !== undefined) rc = boundIntent(arg0, arg1);
        else if (arg0 !== undefined) rc = boundIntent(arg0);
        else                         rc = boundIntent();

        return rc;
    }
};

module.exports = intent;
