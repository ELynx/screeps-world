'use strict';

var spawn =
{
    makeEmptyStructure: function()
    {
        let result =
        {
            urgent: [],
            normal: [],
            low:    []
        };

        return result;
    },

    prepareMemory: function()
    {
        if (_.isUndefined(Memory.spawn_v1) || _.isEmpty(Memory.spawn_v1))
        {
            let emptyStructure = this.makeEmptyStructure();

            console.log('Generating empty structure for spawn, v1');
            console.log(JSON.stringify(emptyStructure));

            Memory.spawn_v1 = emptyStructure;
        }
    }
};

module.exports = spawn;
