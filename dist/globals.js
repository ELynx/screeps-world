var debugVisualY  = 0;

const roomDebugReset = function()
{
    debugVisualY = 0;
};

const roomDebug = function(room, what)
{
    room.visual.text(what, 40, debugVisualY++, { align: 'left' });
};

const NO_DESTINATION = '';

const creepAssigned = function(creep)
{
    return creep.memory.dest != NO_DESTINATION;
};

const creepNotAssigned = function(creep)
{
    return creep.memory.dest == NO_DESTINATION;
};

const assignCreep = function(creep, target)
{
    creep.memory.dest = target.id;
};

const unassignCreep = function(creep)
{
    creep.memory.dest = NO_DESTINATION;
};

const creepTarget = function(creep)
{
    return Game.getObjectById(creep.memory.dest);
};

module.exports =
{
    roomDebugReset,
    roomDebug,

    NO_DESTINATION,

    creepAssigned,
    creepNotAssigned,
    assignCreep,
    unassignCreep,
    creepTarget
};
