'use strict';

var globals        = require('globals');
var spawn          = require('routine.spawn');
var makeDebuggable = require('routine.debuggable');

const profiler = require('screeps-profiler');

Room.prototype.getControlPos = function()
{
    return new RoomPosition(25, 25, this.name);
};

Creep.prototype.getFlagName = function()
{
    return this.memory.flag;
};

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

    return Game.rooms[crum].getControlPos();
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
        let creeps = _.filter(Game.creeps, function(creep) { return creep.name.startsWith(this.id); }, this);

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
                spawn.erase(flagName);
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
                    spawn.erase(flagName);
                    flag.remove();

                    continue;
                }
            }

            const has = spawn.count(flagName);

            if (has < want)
            {
                flag.setSecondaryColor(COLOR_GREY);
            }
            else
            {
                flag.setSecondaryColor(COLOR_WHITE);
                continue;
            }

            const creepNamePrefix = flagName + '_' + Game.time + '_';
            const creepMemory =
            {
                crum: flag.pos.roomName,
                flag: flagName
            };

            spawn.addNormal(
                flagName,            // id in queue
                this.id,             // body, string indicates to call body function
                creepNamePrefix,     // name
                creepMemory,         // memory
                spawn.ANY_ROOM_FROM, // from
                flag.pos.roomName,   // to
                want - has           // n
            );
        } // end of loop for all flags
    }; // end of act

    this.register = function()
    {
        globals.registerTaskController(this);
        spawn.registerBodyFunction(this);

        profiler.registerObject(this, this.id);
    };
};

module.exports = Tasked;
