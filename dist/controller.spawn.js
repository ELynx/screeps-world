var globals = require('globals');

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
                memory :
                {
                    dest : globals.NO_DESTINATION
                }
            }
        ) == OK;
    }

    return false;
};

var spawnController =
{
    /**
    @param {Room} room
    **/
    control: function(room)
    {
        const creeps = room.find(FIND_MY_CREEPS);

        var creepsBalance = TargetCreepCount - creeps.length;

        if (creepsBalance > 0)
        {
            const bodyType = [MOVE, CARRY, WORK];

            var spawns = room.find(FIND_MY_SPAWNS);

            for (var i = 0; i < spawns.length && creepsBalance > 0; ++i)
            {
                if (doSpawn(spawns[i], bodyType))
                {
                    --creepsBalance;
                }
            }
        }

        const textProp = { align: 'left' };

        room.visual.text('<Spawn controller>',                     globals.DEBUG_VISUAL_Y0, globals.DEBUG_VISUAL_X++, textProp);
        room.visual.text('Target creep count ' + TargetCreepCount, globals.DEBUG_VISUAL_Y0, globals.DEBUG_VISUAL_X++, textProp);
        room.visual.text('Actual creep count ' + creeps.length,    globals.DEBUG_VISUAL_Y0, globals.DEBUG_VISUAL_X++, textProp);
    }
};

module.exports = spawnController;
