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
    workUniversalCache: { },

    /**
    BODY Universal worker.
    Could do any work.
    @param {integer} energyLevel.
    @return {Array} level, body.
    **/
    0: function(energyLevel)
    {
        if (energyLevel == 0)
        {
            return [ 0, [] ];
        }

        const cacheHit = this.workUniversalCache[energyLevel];

        if (cacheHit)
        {
            return cacheHit.slice(0);
        }

        // total 250 per iteration
        const front = [WORK,  MOVE]; // 150 = 100 50
        const back  = [CARRY, MOVE]; // 100 = 50  50

        const total = energyLevel > 3 ? 3 : energyLevel;

        var body = [];
        for (var i = 0; i < total; ++i)
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

        // 800       100   100   100   100   100   50     50    50    50    50    50
        return [ 3, [WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE] ];
    },

    /**
    BODY Miner.
    Not detailed yet, copy Restocker.
    **/
    2: function(energyLevel)
    {
        return this[1](energyLevel);
    }
};

module.exports = bodywork;
