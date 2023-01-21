'use strict';

var Process = require('process.template');

var secutiryProcess = new Process('security');

const ThreatStep = 60;
const ThreatMax  = 5;

secutiryProcess.work = function(room)
{
    this.debugHeader(room);

    let threatLevel = room.memory.threat  || 0;
    let threatTimer = room.memory.threatT || (Game.time - ThreatStep);

    const hostileCreeps = room.find(
        FIND_CREEPS,
        {
            filter: function(creep)
            {
                return creep.hostile();
            }
        }
    );

    if (hostileCreeps.length > 0)
    {
        if (threatTimer + ThreatStep <= Game.time)
        {
            if (threatLevel < ThreatMax)
            {
                ++threatLevel;
                console.log(room.name + ' threat escalated to ' + threatLevel);
            }

            threatTimer = Game.time;
        }

        const ctrl = room.controller;

        if (!ctrl.safeMode &&
            !ctrl.safeModeCooldown &&
            !ctrl.upgradeBlocked &&
             ctrl.safeModeAvailable > 0)
        {
            for (const flagName in Game.flags)
            {
                if (!flagName.startsWith(this.id))
                {
                    continue;
                }

                const flag = Game.flags[flagName];

                if (flag.pos.roomName != room.name)
                {
                    continue;
                }

                const range = flag.getValue();

                if (range < 0)
                {
                    continue;
                }

                const trigger = flag.pos.hasInSquareArea(
                    LOOK_CREEPS,
                    range,
                    function(creep)
                    {
                        if (creep.hostile() && creep.owner != 'Invader')
                        {
                            return true;
                        }

                        return false;
                    }
                );

                if (trigger.length > 0)
                {
                    const rc = ctrl.activateSafeMode();

                    const notification = 'Room ' + room.name + ' requested safe mode [' + rc + ']';

                    console.log(notification);
                    Game.notify(notification);

                    break;
                }
            } // end of loop for all flags
        } // end of "if safe mode reqiest possible"
    } // end of "if hostile creeps exist"
    else
    {
        if (threatTimer + ThreatStep < Game.time)
        {
            --threatLevel;
            threatTimer = Game.time;

            console.log(room.name + ' threat deescalated to ' + threatLevel);
        }
    }

    if (threatLevel == ThreatMax)
    {
        // allow to grab energy
        room.memory.stre = 0;
    }
    else
    {
        // restore level from shadow copy
        room.memory.stre = room.memory._stre || 0;
    }

    if (threatLevel > 0)
    {
        room.memory.threat  = threatLevel;
        room.memory.threatT = threatTimer;

        this.debugLine(room, "Threat level " + threatLevel);
    }
    else
    {
        room.memory.threat  = undefined;
        room.memory.threatT = undefined;
    }
};

secutiryProcess.register();

module.exports = secutiryProcess;
