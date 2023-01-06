'use strict';

var Process = require('process.template');

var linkProcess = new Process('link');

const Treshold = 50;

linkProcess.work = function(room)
{
    this.debugHeader(room);

    const allLinks = room.find(
        FIND_MY_STRUCTURES,
        {
            filter: function(structure)
            {
                return structure.structureType == STRUCTURE_LINK && structure.isActiveSimple();
            }
        }
    );

    if (allLinks.length == 0)
    {
        return;
    }

    let sourceLinks = [];
    let destLinks   = [];

    const useAsSource = function(someLink)
    {
        return someLink.cooldown == 0 && someLink.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
    };

    const useAsDest = function(someLink)
    {
        // cut off transfer, due to losses it is never 100% full
        return someLink.store.getFreeCapacity(RESOURCE_ENERGY) < Treshold;
    };

    for (let i = 0; i < allLinks.length; ++i)
    {
        let curr = allLinks[i];

        // quick flag, source keeps to be source
        if (curr.isSource())
        {
            if (useAsSource(curr))
            {
                sourceLinks.push(curr);
            }
        }
        else
        {
            if (useAsDest(curr))
            {
                destLinks.push(curr);
            }
        }
    }

    if (sourceLinks.length == 0 ||
        destLinks.length == 0)
    {
        return;
    }

    if (sourceLinks.length > 1 && destLinks.length > 1)
    {
        sourceLinks.sort(
            function(l1, l2)
            {
                // STRATEGY most energy first
                return l2.store[RESOURCE_ENERGY] - l1.store[RESOURCE_ENERGY];
            }
        );
    }

    if (destLinks.length > 1)
    {
        destLinks.sort(
            function(l1, l2)
            {
                // STRATEGY keep it CPU-simple
                return l1.store[RESOURCE_ENERGY] - l2.store[RESOURCE_ENERGY];
            }
        );
    }

    let didx = 0;
    for (let sidx = 0; sidx < sourceLinks.length; ++sidx)
    {
        let s = sourceLinks[sidx];
        let d = destLinks[didx];

        s.transferEnergy(d);

        ++didx;
        if (didx >= destLinks.length)
        {
            didx = 0;
        }
    }
};

linkProcess.register();

module.exports = linkProcess;
