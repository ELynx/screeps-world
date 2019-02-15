var CONST = require('constants');

var spawnActor =
{
    /**
    @param {Spawn} spawn
    @param {array<string>} bodyType
    @return True if creep spawn initiated
    **/
    act: function(spawn, bodyType)
    {
        var name = 'creep_' + spawn.id + '_' + Game.time;

        if (spawn.spawnCreep(bodyType, name, { dryRun: true }) == OK)
        {
            return spawn.spawnCreep(bodyType, name,
                {
                    memory :
                    {
                        dest : CONST.NO_DESTINATION
                    }
                }
            ) == OK;
        }

        return false;
    }
};

module.exports = spawnActor;
