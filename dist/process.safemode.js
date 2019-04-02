'use strict';

var Process = require('process.template');

var safemodeProcess = new Process('safemode');

safemodeProcess.work = function(room, hostileCreeps)
{
    this.debugHeader(room);

    if (hostileCreeps.length > 0)
    {
        const ctrl = room.controller;

        if (ctrl && ctrl.my)
        {
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

                    let range = 3; // red, for brevity

                    if (flag.color == COLOR_YELLOW)
                    {
                        range = 2;
                    }
                    else if (flag.color == COLOR_GREEN)
                    {
                        range = 1;
                    }

                    const trigger = flag.pos.findInRange(hostileCreeps, range);
                    if (trigger.length > 0)
                    {
                        const rc = ctrl.activateSafeMode();

                        const notification = 'Room ' + name + ' requested safeMode [' + rc + ']';

                        Game.notify(notification);
                        console.log(notification);

                        break;
                    }
                }
            }
        }
    }
};

safemodeProcess.register();

module.exports = safemodeProcess;
