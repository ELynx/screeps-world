'use strict';

var globals = require('globals');
var Process = require('process.template');

var linkProcess = new Process('link');

linkProcess.work = function(room, roomCreeps)
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

    // predict creep position
    var allTargets = [];
    for (var i = 0; i < roomCreeps.length; ++i)
    {
        const creep = roomCreeps[i];

        if (creep.memory.rstk == true)
        {
            continue;
        }

        const target = globals.creepTarget(creep);
        if (target)
        {
            allTargets.push(target);
        }
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

        // quick flag, source keeps to be source
        if (curr._source_)
        {
            if (goodToSource(curr))
            {
                sourceLinks.push(curr);
            }
        }
        else
        {
            // STRATEGY distance from link to source
            const sourcesNearby = curr.pos.findInRange(allSources, 2);
            curr._source_ = sourcesNearby.length > 0;

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
                    // TODO by cave?
                    // STRATEGY predict where energy will be needed
                    const targetsNearby = curr.pos.findInRange(allTargets, 5);

                    if (targetsNearby.length > 0)
                    {
                        curr._targets_ = targetsNearby.length;
                        destLinks.push(curr);
                    }
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
                // STRATEGY least energy per target first
                return Math.ceil(l1.energy / l1._targets_) - Math.ceil(l2.energy / l2._targets_);
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
