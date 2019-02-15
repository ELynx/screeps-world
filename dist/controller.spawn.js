var CONST = require('constants');

// parameters
const TargetCreepCount = 4;

// helpers

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
					dest : CONST.NO_DESTINATION
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
	@param {array<Creep>} creeps already present
    **/
    control: function(room, creeps)
    {
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

		room.visual.text('Target creep count ' + TargetCreepCount, 40, 0, textProp);
		room.visual.text('Actual creep count ' + creeps.length,    40, 1, textProp);
		room.visual.text('Queued creep count [TODO]',              40, 2, textProp);
    }
};

module.exports = spawnController;
