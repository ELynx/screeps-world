'use strict';

var makeDebuggable = require('routine.debuggable');
//const profiler = require('screeps-profiler');

Creep.prototype.getTaskedRoom = function()
{
    return this.memory.dest;
};

Creep.prototype.setTaskedRoom = function(dest)
{
    this.memory.dest = dest;
};

function Tasked(id)
{
    /**
    Unique identifier.
    **/
    this.id = id;

    // attach methods that allow fast debug writing
    makeDebuggable(this, 'Tasked');

    this.allCreepsPrepare = undefined;

    this.creepPrepare = undefined;

    this.creepAtDestination = undefined;

    this._creepRoomTravel = function(creep)
    {
        if (creep._canMove_)
        {
            const destRoom = new RoomPosition(25, 25, creep.getTaskedRoom());
            creep.moveTo(destRoom, { reusePath: 50, range: 23 });
        }
    };

    this.creepRoomTravel = function(creep)
    {
        this._creepRoomTravel(creep);
    };

    this._coastToHalt = function(creep)
    {
        // move closer to center
        if (creep._canMove_ && !creep.pos.inRangeTo(25, 25, 15))
        {
            creep.moveTo(25, 25, { ignoreRoads: true, maxRooms:1, range: 15 });
        }
    };

    this.flagPrepare = undefined;

    this.makeBody = undefined;

    this.act = function()
    {
        var self = this;
        let creeps = _.filter(Game.creeps, function(creep) { return creep.name.startsWith(self.id); });

        this.roomCount = { };

        if (this.allCreepsPrepare)
        {
            this.allCreepsPrepare();
        }

        for (var i = 0; i < creeps.length; ++i)
        {
            let creep = creeps[i];

            creep._canMove_ = creep.getActiveBodyparts(MOVE) > 0 && creep.fatigue == 0;

            if (this.creepPrepare)
            {
                this.creepPrepare(creep);
            }

            const dest = creep.getTaskedRoom();

            // count how many creeps are already going to destination
            let now = this.roomCount[dest] || 0;
            ++now;
            this.roomCount[dest] = now;

            if (creep.spawning)
            {
                continue;
            }

            if (creep.pos.roomName == dest)
            {
                this.creepAtDestination(creep);
            }
            else
            {
                this.creepRoomTravel(creep);
            }
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

            if (this.flagPrepare)
            {
                if (!this.flagPrepare(flag))
                {
                    continue;
                }
            }

            const want = flag.getValue();
            const has  = this.roomCount[flag.pos.roomName] || 0;

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
                const creepName = flagName + '_' + Game.time + '_' + delta;
                const creepArgs = {
                    memory:
                    {
                        dest: flag.room ? flag.room.name : flag.name.substr(this.id.length + 1) // name + separator
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
                    creepArgs
                );

                if (rc == OK)
                {
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
        //profiler.registerObject(this, this.id);
    };
};

module.exports = Tasked;
