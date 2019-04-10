'use strict';

/**
MEMO - body part cost

MOVE            50
WORK            100
ATTACK          80
CARRY           50
HEAL            250
RANGED_ATTACK   150
TOUGH           10
CLAIM           600
**/

var bodywork =
{
    /**
    BODY Universal worker.
    Could do any work.
    @param {integer} energyLevel.
    @return {Array} level, body.
    **/
    0: function(energyLevel)
    {
        if (!this.workUniversalCache)
        {
            this.workUniversalCache = { };
        }

        const cacheHit = this.workUniversalCache[energyLevel];

        if (cacheHit)
        {
            return cacheHit.slice(0);
        }

        // total 250 per iteration
        const front = [WORK,  MOVE]; // 150 = 100 50
        const back  = [CARRY, MOVE]; // 100 = 50  50

        // on level 0 make small ones like on level 1
        // not stronger than level 3
        const total = Math.max(1, Math.min(3, energyLevel));

        let body = [];
        for (let i = 0; i < total; ++i)
        {
            body = front.concat(body).concat(back);
        }

        this.workUniversalCache[energyLevel] = [total, body];

        return [total, body];
    },

    /**
    BODY Restocker.
    Harvest source, restock containers and links.
    @param {integer} level.
    @return {Array} level, body.
    **/
    1: function(energyLevel)
    {
        if (energyLevel < 3)
        {
            return [ 0, [] ];
        }

        if (energyLevel < 5)
        {
            // 800       100   100   100   100   100   50     50    50    50    50    50
            return [ 1, [WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE] ];
        }

        // 1550      100   100   100   100   100   100   100   100   100   100   50     50    50    50    50    50    50    50    50    50    50
        return [ 2, [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE] ];
    },

    /**
    BODY Miner.
    Harvest mineral thought extractor, restock to terminal.
    @param {integer} level.
    @return {Array} level, body.
    **/
    2: function(energyLevel)
    {
        // STRATEGY each WORK generate cooldown, so multitude of it does not improve the process
        // STRATEGY harvest for 300 ticks, travel for 30
        // 450       100   50     50     50     50    50    50    50
        return [ 1, [WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE] ];
    }
};

module.exports = bodywork;
