var globals =
{
    roomDebugY: 0,

    roomDebugReset: function()
    {
        this.roomDebugY = 0;
    },

    roomDebug: function(room, what)
    {
        room.visual.text(what, 40, this.roomDebugY++, { align: 'left' });
    },

    NO_DESTINATION: '',

    creepAssigned: function(creep)
    {
        return creep.memory.dest != this.NO_DESTINATION;
    },

    creepNotAssigned: function(creep)
    {
        return creep.memory.dest == this.NO_DESTINATION;
    },

    assignCreep: function(creep, target)
    {
        creep.memory.dest = target.id;
    },

    unassignCreep: function(creep)
    {
        creep.memory.dest = this.NO_DESTINATION;
    },

    creepTarget: function(creep)
    {
        return Game.getObjectById(creep.memory.dest);
    }
};

module.exports = globals;
