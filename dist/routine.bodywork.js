'use strict';

var spawn = require('routine.spawn');

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
    @param {integer} energyLevel.
    @return {Array} level, body.
    **/
    worker: function(energyLevel)
    {
        if (!this.workUniversalCache)
        {
            this.workUniversalCache = { };
        }

        const cacheHit = this.workUniversalCache[energyLevel];
        if (cacheHit)
        {
            return cacheHit;
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

        this.workUniversalCache[energyLevel] = body;

        return body;
    },

    /**
    BODY Restocker.
    @param {integer} level.
    @return {Array} level, body.
    **/
    restocker: function(energyLevel)
    {
        if (energyLevel < 3)
        {
            return [];
        }

        // special case, limp a bit
        // don't care about the level
        if (energyLevel == 3)
        {
            // 800  100   100   100   100   100   50     50    50    50    50    50
            return [WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE];
        }

        if (energyLevel < 6)
        {
            // 850  100   100   100   100   100   50     50    50    50    50    50    50
            return [WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
        }

        // 1700 100   100   100   100   100   100   100   100   100   100   50     50     50    50    50    50    50    50    50    50    50    50    50    50
        return [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
    },

    /**
    BODY Miner.
    @param {integer} level.
    @return {Array} level, body.
    **/
    miner: function(energyLevel)
    {
        if (energyLevel < 3)
        {
            return [];
        }

        // special case, limp a bit
        // don't care about the level
        if (energyLevel == 3)
        {
            // 800  100   100   100   100   100   50     50    50    50    50    50
            return [WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE];
        }

        // 850  100   100   100   100   100   50     50    50    50    50    50    50
        return [WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
    },

    _injectIntoSpawnPool: function(id, routine)
    {
        const bound = _.bind(routine, this);

        spawn.registerBodyFunction(
            {
                id: id,
                makeBody: function(spawn)
                {
                    return bound(spawn.room.memory.elvl);
                }
            }
        );
    },

    injectIntoSpawnPool: function()
    {
        this._injectIntoSpawnPool('worker',    this.worker);
        this._injectIntoSpawnPool('restocker', this.restocker);
        this._injectIntoSpawnPool('miner',     this.miner);
    }
};

bodywork.injectIntoSpawnPool();

module.exports = bodywork;
