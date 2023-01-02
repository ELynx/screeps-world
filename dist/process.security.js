'use strict';

var Process = require('process.template');

var secutiryProcess = new Process('security');

const ThreatStep = 20;
const ThreatMax  = 5;

secutiryProcess.work = function(room, hostileCreeps)
{
    this.debugHeader(room);

    let threatLevel = room.memory.threat  || 0;
    let threatTimer = room.memory.threatT || (Game.time - ThreatStep);

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
                if (!flagName.startsWith('fence'))
                {
                    continue;
                }

                const flag = Game.flags[flagName];

                if (flag.pos.roomName != room.name)
                {
                    continue;
                }

                let range = flag.getValue();

                if (range < 0)
                {
                    continue;
                }

                const trigger = flag.pos.findInRange(
                    hostileCreeps,
                    range,
                    {
                        filter: function(creep)
                        {
                            return creep.owner != "Invader";
                        }
                    }
                );

                if (trigger.length > 0)
                {
                    const rc = ctrl.activateSafeMode();

                    const notification = 'Room ' + room.name + ' requested safe mode [' + rc + ']';

                    Game.notify(notification);
                    console.log(notification);

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

    if (threatLevel > 0)
    {
        room.memory.threat = threatLevel;
        room.memory.threatT = threatTimer;

        this.debugLine(room, "Threat level " + threatLevel);
    }
    else
    {
        room.memory.threat = undefined;
        room.memory.threatT = undefined;
    }
};

secutiryProcess.register();

module.exports = secutiryProcess;
