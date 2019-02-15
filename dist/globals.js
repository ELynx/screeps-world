var globals =
{
    debugVisualY : 0,

    roomDebugReset : function()
    {
        this.debugVisualY = 0;
    },

    roomDebug : function(room, what)
    {
        room.visual.text(what, 40, this.debugVisualY++, { align: 'left' });
    },

    NO_DESTINATION : '',

    creepAssigned : function(creep)
    {
        return creep.memory.dest != this.NO_DESTINATION;
    },

    creepNotAssigned = function(creep)
    {
        return creep.memory.dest == this.NO_DESTINATION;
    },

    assignCreep = function(creep, target)
    {
        creep.memory.dest = target.id;
    },

    const unassignCreep = function(creep)
    {
        creep.memory.dest = this.NO_DESTINATION;
    },

    creepTarget = function(creep)
    {
        return Game.getObjectById(creep.memory.dest);
    }
};

module.exports = globals;
