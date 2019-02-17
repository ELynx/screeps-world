var Controller = require('controller.template');

var spawnController = new Controller('spawn');

// parameters
const TargetCreepCount = 4;

/**
@param {Spawn} spawn
@param {array<string>} bodyType
@return True if creep spawn initiated
**/
const doSpawn = function(spawn, bodyType)
{
    var name = 'creep_' + spawn.id + '_' + Game.time;

    if (spawn.spawnCreep(bodyType, name, { dryRun: true }) == OK)
    {
        return spawn.spawnCreep(bodyType, name,
            {
                memory:
                {
                    ctrl: globals.NO_CONTROL,
                    actd: globals.NO_ACT_DISTANCE,
                    dest: globals.NO_DESTINATION
                }
            }
        ) == OK;
    }

    return false;
};

spawnController.targets = function(room)
{
    return room.find(FIND_MY_SPAWNS);
};

spawnController.creeps = function(room)
{
    return room.find(FIND_MY_CREEPS);
};

spawnController.control = function(room)
{
    this.debugPing(room);

    const creeps = this.creeps(room);

    var creepsBalance = TargetCreepCount - creeps.length;

    if (creepsBalance > 0)
    {
        const bodyType = [MOVE, CARRY, WORK];

        var spawns = this.targets(room);

        for (var i = 0; i < spawns.length && creepsBalance > 0; ++i)
        {
            if (doSpawn(spawns[i], bodyType))
            {
                --creepsBalance;
            }
        }
    }

    globals.roomDebug(room, 'Actual creep # ' + creeps.length);
    globals.roomDebug(room, 'Target creep # ' + TargetCreepCount);
};

module.exports = spawnController;
