'use strict';

var spawn =
{
    ANY_ROOM_FROM: 'ANY',

    withBodyFunctions: { },

    registerBodyFunction: function(withBodyFunction)
    {
        this.withBodyFunctions[withBodyFunction.id] = withBodyFunction;
    },

    makeEmptyStructure: function()
    {
        let result = { urgent: [], normal: [], lowkey: [] };
        return result;
    },

    noMemory: function()
    {
        return _.isUndefined(Memory.spawn_v1) || _.isEmpty(Memory.spawn_v1);
    },

    prepareMemory: function()
    {
        if (this.noMemory())
        {
            let emptyStructure = this.makeEmptyStructure();

            console.log('Generating empty structure for spawn_v1');
            console.log(JSON.stringify(emptyStructure));

            Memory.spawn_v1 = emptyStructure;
        }
    },

    _add: function(target, id, body, name, memory, from, to, n)
    {
        for (let i = 0; i < n; ++i)
        {
            const model = 
            {
                id:     id,
                body:   body,
                name:   name + '_' + Game.time + '_' + i,
                memory: memory,
                from:   from,
                to:     to,

                _time:  Game.time
            };

            target.push(model);
        }
    },

    addUrgent: function(id, body, name, memory, from, to, n = 1)
    {
        this.prepareMemory();
        this._add(Memory.spawn_v1.urgent, id, body, name, memory, from, to, n);
    },

    addNormal: function(id, body, name, memory, from, to, n = 1)
    {
        this.prepareMemory();
        this._add(Memory.spawn_v1.normal, id, body, name, memory, from, to, n);
    },

    addLowkey: function(id, body, name, memory, from, to, n = 1)
    {
        this.prepareMemory();
        this._add(Memory.spawn_v1.lowkey, id, body, name, memory, from, to, n);
    },

    _peek: function()
    {
        if (this.noMemory())
        {
            return undefined;
        }

        if (Memory.spawn_v1.urgent.length > 0)
        {
            return Memory.spawn_v1.urgent[0];
        }

        if (Memory.spawn_v1.normal.length > 0)
        {
            return Memory.spawn_v1.normal[0];
        }

        if (Memory.spawn_v1.lowkey.length > 0)
        {
            return Memory.spawn_v1.lowkey[0];
        }

        return undefined;
    },

    peek: function()
    {
        return this._peek();
    },

    _get: function()
    {
        if (this.noMemory())
        {
            return undefined;
        }

        if (Memory.spawn_v1.urgent.length > 0)
        {
            return Memory.spawn_v1.urgent.shift();
        }

        if (Memory.spawn_v1.normal.length > 0)
        {
            return Memory.spawn_v1.normal.shift();
        }

        if (Memory.spawn_v1.lowkey.length > 0)
        {
            return Memory.spawn_v1.lowkey.shift();
        }

        return undefined;        
    },

    get: function()
    {
        return this._get();
    },

    __count: function(target, id)
    {
        let withId = 0;
        for (let i = 0; i < target.length; ++i)
        {
            const stored = target[i];

            if (stored.id == id)
            {
                ++withId;
            }
        }

        return withId;
    },

    _count: function(id)
    {
        if (this.noMemory())
        {
            return 0;
        }

        let total = 0;
        total += this.__count(Memory.spawn_v1.urgent, id);
        total += this.__count(Memory.spawn_v1.normal, id);
        total += this.__count(Memory.spawn_v1.lowkey, id);

        return total;
    },

    count: function(id)
    {
        return this._count(id);
    },

    _erase: function(id)
    {
        if (this.noMemory())
        {
            return;
        }

        const filter = function(stored)
        {
            return stored.id == id;
        };

        Memory.spawn_v1.urgent = _.filter(Memory.spawn_v1.urgent, filter);
        Memory.spawn_v1.normal = _.filter(Memory.spawn_v1.normal, filter);
        Memory.spawn_v1.lowkey = _.filter(Memory.spawn_v1.lowkey, filter);
    },

    erase: function(id)
    {
        this._erase(id);
    }
};

module.exports = spawn;
