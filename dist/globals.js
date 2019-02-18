var globals =
{
    verbose: false,

    debugReset: function()
    {
        this.roomDebug = { };
    },

    roomDebug: function(room, what)
    {
        if (this.verbose)
        {
            this.roomDebug[room.id] = this.roomDebug[room.id] || 0;
            room.visual.text(what, 40, this.roomDebug[room.id]++, { align: 'left' });
        }
    },

    NO_CONTROL: '',
    NO_ACT_DISTANCE: 0,
    NO_DESTINATION: '',

    creepAssigned: function(creep)
    {
        return !creep.spawning && creep.memory.ctrl != this.NO_CONTROL;
    },

    creepNotAssigned: function(creep)
    {
        return !creep.spawning && creep.memory.ctrl == this.NO_CONTROL;
    },

    assignCreep: function(controller, target, creep)
    {
        creep.memory.ctrl = controller.id;
        creep.memory.actd = controller.actDistance;
        creep.memory.dest = target.id;
    },

    unassignCreep: function(creep)
    {
        creep.memory.ctrl = this.NO_CONTROL;
        creep.memory.actd = this.NO_ACT_DISTANCE;
        creep.memory.dest = this.NO_DESTINATION;
    },

    creepTarget: function(creep)
    {
        return Game.getObjectById(creep.memory.dest);
    }
};

module.exports = globals;
