'use strict';

var spawn =
{
    ANY_ROOM_FROM: 'ANY',
    ANY_ROOM_TO:   'ANY',

    withBodyFunctions: { },

    registerBodyFunction: function(withBodyFunction)
    {
        this.withBodyFunctions[withBodyFunction.id] = withBodyFunction;
    },

    makeEmptyStructure: function()
    {
        let result = { urgent: [], normal: [], low: [] };
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

            console.log('Generating empty structure for spawn, v1');
            console.log(JSON.stringify(emptyStructure));

            Memory.spawn_v1 = emptyStructure;
        }
    },

    _add: function(target, id, body, name, memory, from, to, n)
    {
        this.prepareMemory();

        for (let i = 0; i < n; ++i)
        {
            target.push(
                {
                    id:     id,
                    body:   body,
                    name:   name + i,
                    memory: memory,
                    from:   from,
                    to:     to,
                    time:   Game.time
                }
            );
        }
    },

    addUrgent: function(id, body, name, memory, from, to, n = 1)
    {
        this._add(Memory.spawn_v1.urgent, id, body, name, memory, from, to, n);
    },

    addNormal: function(id, body, name, memory, from, to, n = 1)
    {
        this._add(Memory.spawn_v1.normal, id, body, name, memory, from, to, n);
    },

    addLow: function(id, body, name, memory, from, to, n = 1)
    {
        this._add(Memory.spawn_v1.low,    id, body, name, memory, from, to, n);
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

        if (Memory.spawn_v1.low.length > 0)
        {
            return Memory.spawn_v1.low[0];
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

        if (Memory.spawn_v1.low.length > 0)
        {
            return Memory.spawn_v1.low.shift();
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
        total += this.__count(Memory.spawn_v1.low,    id);

        return total;
    },

    count: function(id)
    {
        return this._count(id);
    },

    __erase: function(target, id)
    {
        // TODO
    },

    _erase: function(id)
    {
        if (this.noMemory())
        {
            return;
        }

        this.__erase(Memory.spawn_v1.urgent, id);
        this.__erase(Memory.spawn_v1.normal, id);
        this.__erase(Memory.spawn_v1.low,    id);
    },

    erase: function(id)
    {
        this._erase(id);
    }
};

module.exports = spawn;
