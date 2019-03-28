'use strict';

var Controller = require('controller.template');

var dismantleController = new Controller('dismantle');

dismantleController.actRange = 1;

dismantleController.act = function(structure, creep)
{
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
    return [];
};

dismantleController.filterCreep = function(creep)
{
    if (creep.sumCarry() == 0)
    {
        return true;
    }

    return false;
};

dismantleController.register();

module.exports = dismantleController;
