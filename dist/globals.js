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
    NO_CONTROL: '',

    creepAssigned: function(creep)
    {
        return creep.memory.ctrl != this.NO_CONTROL;
    },

    creepNotAssigned: function(creep)
    {
        return creep.memory.ctrl == this.NO_CONTROL;
    },

    assignCreep: function(ctrl, target, creep)
    {
        creep.memory.dest = target.id;
        creep.memory.ctrl = ctrl;
    },

    unassignCreep: function(creep)
    {
        creep.memory.dest = this.NO_DESTINATION;
        creep.memory.ctrl = this.NO_CONTROL;
    },

    creepTarget: function(creep)
    {
        return Game.getObjectById(creep.memory.dest);
    }
};

module.exports = globals;
