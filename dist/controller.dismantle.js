'use strict';

var Controller = require('controller.template');

var dismantleController = new Controller('dismantle');

dismantleController.actRange = 1;

dismantleController.act = function(structure, creep)
{
    if (!structure.room.memory.dism)
    {
        structure.room.memory.dism = [];
    }

    structure.room.memory.dism.push(structure.id);

    var result = false;

    // will drop on ground if not enough free space
    if (creep.sumCarry() < creep.carryCapacity)
    {
        result = creep.dismantle(structure) == OK;
    }

    return result;
};

dismantleController.dynamicTargets = function(room, creep)
{
    // TODO unify
    for (const flagName in Game.flags)
    {
        if (!flagName.startsWith('dism'))
        {
            continue;
        }

        const flag = Game.flags[flagName];

        if (flag.pos.roomName != room.name)
        {
            continue;
        }

        var types = undefined;

        if (flag.secondaryColor == COLOR_GREY)
        {
            types = [STRUCTURE_WALL, STRUCTURE_RAMPART];
        }
        else if (flag.secondaryColor == COLOR_GREEN)
        {
            types = [STRUCTURE_RAMPART];
        }
        else if (flag.secondaryColor == COLOR_WHITE)
        {
            types = [STRUCTURE_ROAD];
        }

        if (!types)
        {
            continue;
        }

        var range = 3; // red, for brevity

        if (flag.color == COLOR_PURPLE)
        {
            range = 5;
        }
        else if (flag.color == COLOR_YELLOW)
        {
            range = 2;
        }
        else if (flag.color == COLOR_GREEN)
        {
            range = 1;
        }
        else if (flag.color == COLOR_BLUE)
        {
            range = 0;
        }

        const dynamic = this._lookAroundCreep(
            room,
            LOOK_STRUCTURES,
            function(structure)
            {
                if (range == 0)
                {
                    if (!structure.pos.isEqualTo(flag.pos))
                    {
                        return false;
                    }
                }
                else
                {
                    if (!structure.pos.inRangeTo(flag.pos, range))
                    {
                        return false;
                    }
                }

                if (types.indexOf(structure.structureType) != -1)
                {
                    return true;
                }
            },
            creep
        );

        if (dynamic.length == 0)
        {
            flag.remove();
        }
        else
        {
            return dynamic;
        }
    }

    return [];
};

dismantleController.filterCreep = function(creep)
{
    if (creep.sumCarry() == 0 &&
        creep.getActiveBodyparts(WORK) > 3)
    {
        return true;
    }

    return false;
};

dismantleController.register();

module.exports = dismantleController;
