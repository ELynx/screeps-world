'use strict';

var temporaryStorage = undefined;

var spawn =
{
    makeEmptyStructure: function()
    {
        return
        {
            TO: 'DO'
        };
    },

    unpackMemory: function()
    {
        if (Memory.spawn_v1)
        {
            temporaryStorage = JSON.parse(Memory.spawn_v1);
        }
        else
        {
            temporaryStorage = makeEmptyStructure();
        }
    },

    packMemory: function()
    {
        if (temporaryStorage)
        {
            Memory.spawn_v1 = JSON.stringify(temporaryStorage);
        }
    }
};

module.exports = spawn;
