'use strict';

var Process = require('process.template');

var linkProcess = new Process('link');

linkProcess.work = function(room)
{
    this.debugHeader(room);

    const allLinks = room.find(
        FIND_MY_STRUCTURES,
        {
            filter: function(structure)
            {
                if (structure.structureType == STRUCTURE_LINK)
                {
                    return structure.isActive();
                }

                return false;
            }
        }
    );

    if (allLinks.length == 0)
    {
        return;
    }

    const allSources = room.find(FIND_SOURCES);

    // TODO there are other ways to fill in energy
    if (allSources.length == 0)
    {
        return;
    }

    var sourceLinks = [];
    var destLinks  = [];

    const goodToSource = function(someLink)
    {
        return someLink.cooldown == 0 && someLink.energy > 0;
    };

    const goodToDest = function(someLink)
    {
        return someLink.energy < someLink.energyCapacity;
    };

    for (var i = 0; i < allLinks.length; ++i)
    {
        var curr = allLinks[i];

        // quick flags
        if (curr._source_)
        {
            if (goodToSource(curr)
            {
                sourceLinks.push(curr);
            }
        }
        else if (curr._dest_)
        {
            if (goodToDest(curr))
            {
                destLinks.push(curr);
            }
        }
        else
        {
            // STRATEGY distance from link to source
            const sourcesNearby = curr.pos.findInRange(allSources, 2);

            curr._source_ = sourcesNearby.length > 0;
            curr._dest_   = !curr._source_;

            if (curr._source_)
            {
                if (goodToSource(curr))
                {
                    sourceLinks.push(curr);
                }
            }
            else
            {
                if (goodToDest(curr))
                {
                    destLinks.push(curr);
                }
            }
        }
    } // end of loop for all links

    if (sourceLinks.length == 0 ||
        destLinks.length == 0)
    {
        return;
    }

    if (sourceLinks.length > 0)
    {
        sourceLinks.sort(
            function(l1, l2)
            {
                // STRATEGY most energy first
                return l2.energy - l1.energy;
            }
        );
    }

    if (destLinks.length > 0)
    {
        destLinks.sort(
            function(l1, l2)
            {
                // STRATEGY least energy first
                return l1.energy - l2.energy;
            }
        );
    }

    var didx = 0;
    for (var sidx = 0; sidx < sourceLinks.length; ++sidx)
    {
        var s = sourceLinks[sidx];
        var d = destLinks[didx];

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
