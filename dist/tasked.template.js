'use strict';

var globals = require('globals');
var makeDebuggable = require('routine.debuggable');
//const profiler = require('screeps-profiler');

Creep.prototype.getFlagName = function()
{
    return this.memory.flag;
}

Creep.prototype.getFlagPos = function()
{
    const flag = Game.flags[this.getFlagName()];
    if (flag)
    {
        return flag.pos;
    }

    return undefined;
};

Creep.prototype.getControlRoom = function()
{
    return this.memory.crum;
};

Creep.prototype.setControlRoom = function(crum)
{
    this.memory.crum = crum;
};

Creep.prototype.getControlPos = function()
{
    const crum    = this.getControlRoom();
    const flagPos = this.getFlagPos();

    if (flagPos)
    {
        if (flagPos.roomName == crum)
        {
            return flagPos;
        }
    }

    const roomPos = new RoomPosition(25, 25, crum);

    return roomPos;
};

Creep.prototype.getSourceRoom = function()
{
    return this.memory.srum;
};

Creep.prototype.getSourcePos = function()
{
    const srum    = this.getSourceRoom();
    const flagPos = this.getFlagPos();

    if (flagPos)
    {
        if (flagPos.roomName == srum)
        {
            return flagPos;
        }
    }

    const roomPos = new RoomPosition(25, 25, srum);

    return roomPos;
};

RoomPosition.prototype.controlDistance = function()
{
    return Math.max(Math.min(this.x, this.y, 49 - this.x, 49 - this.y) - 1, 0);
};

function Tasked(id)
{
    this.FLAG_REMOVE = 0;
    this.FLAG_IGNORE = 1;
    this.FLAG_SPAWN  = 2;

    /**
    Unique identifier.
    **/
    this.id = id;

    // attach methods that allow fast debug writing
    makeDebuggable(this, 'Tasked');

    this.prepare = undefined;

    this.creepPrepare = undefined;

    this.creepAtDestination = undefined;

    this._creepRoomTravel = function(creep)
    {
        if (creep._canMove_)
        {
            const controlPos = creep.getControlPos();
            creep.moveToWrapper(controlPos, { reusePath: 50, range: controlPos.controlDistance() });
        }
    };

    this.creepRoomTravel = function(creep)
    {
        this._creepRoomTravel(creep);
    };

    this._coastToHalt = function(creep)
    {
        if (!creep._canMove_)
        {
            return;
        }

        const pos = creep.getControlPos();

        if (creep.pos.roomName != pos.roomName)
        {
            return;
        }

        const haltRange = Math.min(15, pos.controlDistance());

        if (!creep.pos.inRangeTo(pos, haltRange))
        {
            creep.moveToWrapper(pos, { maxRooms: 1, range: haltRange });
        }
    };

    this.flagPrepare = undefined;

    this.makeBody = undefined;

    this.act = function()
    {
        var self = this;
        let creeps = _.filter(Game.creeps, function(creep) { return creep.name.startsWith(self.id); });

        this.roomCount = { };

        if (this.prepare)
        {
            this.prepare();
        }

        for (var i = 0; i < creeps.length; ++i)
        {
            let creep = creeps[i];

            creep._canMove_ = creep.getActiveBodyparts(MOVE) > 0 && creep.fatigue == 0;

            if (this.creepPrepare)
            {
                this.creepPrepare(creep);
            }

            // count how many creeps are already going to destination
            const flagName = creep.getFlagName();
            let now = this.roomCount[flagName] || 0;
            ++now;
            this.roomCount[flagName] = now;

            if (creep.spawning)
            {
                continue;
            }

            if (creep.pos.roomName == creep.getControlRoom())
            {
                this.creepAtDestination(creep);
            }
            else
            {
                this.creepRoomTravel(creep);
            }
        }

        if (this.makeBody === undefined)
        {
            return;
        }

        let spawns = _.filter(Game.spawns, function(spawn) { return !spawn.spawning && !spawn._tasked_; });

        if (spawns.length == 0)
        {
            return;
        }

        for (const flagName in Game.flags)
        {
            if (!flagName.startsWith(this.id))
            {
                continue;
            }

            let flag = Game.flags[flagName];

            const want = flag.getValue();

            // sanitize flags
            if (want < 1)
            {
                flag.remove();
                continue;
            }

            if (this.flagPrepare)
            {
                const decision = this.flagPrepare(flag);
                if (decision == this.FLAG_IGNORE)
                {
                    flag.resetSecondaryColor();
                    continue;
                }

                if (decision != this.FLAG_SPAWN)
                {
                    flag.remove();
                    continue;
                }
            }

            if (spawns.length > 1)
            {
                // starting with closest
                spawns.sort(
                    function(s1, s2)
                    {
                        const d1 = Game.map.getRoomLinearDistance(flag.pos.roomName, s1.room.name);
                        const d2 = Game.map.getRoomLinearDistance(flag.pos.roomName, s2.room.name);

                        return d1 - d2;
                    }
                );
            }

            const has = this.roomCount[flag.name] || 0;

            if (has < want)
            {
                flag.setSecondaryColor(COLOR_GREY);
            }
            else
            {
                flag.setSecondaryColor(COLOR_WHITE);
            }

            let delta = want - has;
            for (let i = 0; i < spawns.length && delta > 0;)
            {
                let spawn = spawns[i];

                const creepBody = this.makeBody(spawn);

                if (creepBody.length == 0)
                {
                    continue; // to next spawn
                }

                const creepName = flagName + '_' + Game.time + '_' + delta;
                const creepArgs = {
                    memory:
                    {
                        crum: flag.pos.roomName,
                        srum: spawn.pos.roomName,
                        flag: flagName
                    },

                    directions:
                    [
                        TOP, TOP_RIGHT, RIGHT, BOTTOM_RIGHT,
                        BOTTOM, BOTTOM_LEFT, LEFT, TOP_LEFT
                    ]
                };

                const rc = spawn.spawnCreep(
                    creepBody,
                    creepName,
                    {
                        dryRun: true
                    }
                );

                if (rc == OK)
                {
                    spawn.spawnCreep(creepBody, creepName, creepArgs);

                    --delta;
                    spawn._tasked_ = true;

                    spawns.splice(i, 1);
                }
                else
                {
                    ++i;
                }
            } // end of loop for all remaining spawns
        } // end of loop for all flags
    }; // end of act

    this.register = function()
    {
        globals.registerTaskController(this);

        //profiler.registerObject(this, this.id);
    };
};

module.exports = Tasked;
