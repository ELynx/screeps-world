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

        let total = 0;

        if (energyLevel == 0)
        {
            total = 1;
        }
        else if (energyLevel < 6)
        {
            total = Math.min(energyLevel, 3);
        }
        else
        {
            total = 6;
        }

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

        if (energyLevel < 6)
        {
            // 800       100   100   100   100   100   50     50    50    50    50    50
            return [ 1, [WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE] ];
        }

        // 1600      100   100   100   100   100   100   100   100   100   100   50     50     50    50    50    50    50    50    50    50    50    50
        return [ 2, [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE] ];
    },

    /**
    BODY Miner.
    Harvest mineral thought extractor, restock to terminal.
    @param {integer} level.
    @return {Array} level, body.
    **/
    2: function(energyLevel)
    {
        if (energyLevel < 3)
        {
            return [ 0, [] ];
        }

        // 800       100   100   100   100   100   50     50    50    50    50    50
        return [ 1, [WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE] ];
    }
};

module.exports = bodywork;
