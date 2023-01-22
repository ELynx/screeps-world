'use strict';

const UsernameSourceKeeper = 'Source Keeper';
const UsernamePowerBank    = 'Power Bank';
const UsernameInvader      = 'Invader';

const isAlly = function(something)
{
    return false;
};

const isNeutral = function(something)
{
    if (something.owner)
    {
        // TODO not always
        if (something.owner.username == UsernameSourceKeeper) return true;
        if (something.owner.username == UsernamePowerBank) return true;
    }

    return false;
};

const isHostile = function(something)
{
    // this will be joy when wrapped by profiler...

    // quickest check
    if (something.my) return false;

    // quick check
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
    Creep.prototype,
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
    Creep.prototype,
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
