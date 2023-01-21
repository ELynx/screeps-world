'use strict';

const UsernameInvader      = 'Invader';
const UsernameSourceKeeper = 'Source Keeper';

const isAlly = function(something)
{
    return false;
};

const isNeutral = function(something)
{
    // TODO not always
    return something.owner && something.owner.username == UsernameSourceKeeper;
};

const isHostile = function(something)
{
    // this will be joy when wrapped by profiler...

    if (something.my) return false;

    // quick checks for predefined names
    if (something.owner)
    {
        if (something.owner.username == UsernameInvader) return true;
    }

    if (something.ally) return false;
    if (something.neutral) return false;

    return true;
};

const isUnowned = function(something)
{
    return something.owner === undefined;
}

Object.defineProperty(
    OwnedStructure.prototype,
    'ally',
    {
        get: function()
        {
            return isAlly(this);
        },
        configurable: true,
        enumerable:   true
    }
);

Object.defineProperty(
    OwnedStructure.prototype,
    'neutral',
    {
        get: function()
        {
            return isNeutral(this);
        },
        configurable: true,
        enumerable:   true
    }
);

Object.defineProperty(
    OwnedStructure.prototype,
    'hostile',
    {
        get: function()
        {
            return isHostile(this);
        },
        configurable: true,
        enumerable:   true
    }
);

Object.defineProperty(
    OwnedStructure.prototype,
    'unowned',
    {
        get: function()
        {
            return isUnowned(this);
        },
        configurable: true,
        enumerable:   true
    }
);

Object.defineProperty(
    Creep.prototype,
    'ally',
    {
        get: function()
        {
            return isAlly(this);
        },
        configurable: true,
        enumerable:   true
    }
);

Object.defineProperty(
    OwnedStructure.prototype,
    'neutral',
    {
        get: function()
        {
            return isNeutral(this);
        },
        configurable: true,
        enumerable:   true
    }
);

Object.defineProperty(
    OwnedStructure.prototype,
    'hostile',
    {
        get: function()
        {
            return isHostile(this);
        },
        configurable: true,
        enumerable:   true
    }
);
