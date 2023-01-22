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
        const username = something.owner.username;

        // TODO not always
        if (username == UsernameSourceKeeper) return true;
        if (username == UsernamePowerBank)    return true;
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

const isPC = function(something)
{
    // quick check
    if (something.my) return true;

    if (something.owner)
    {
        const username = something.owner.username;

        if (username == UsernameSourceKeeper) return false;
        if (username == UsernamePowerBank)    return false;
        if (username == UsernameInvader)      return false;
    }

    return true;
};

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
    OwnedStructure.prototype,
    'pc',
    {
        get: function()
        {
            return isPC(this);
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

Object.defineProperty(
    Creep.prototype,
    'pc',
    {
        get: function()
        {
            return isPC(this);
        },
        configurable: true,
        enumerable:   true
    }
);
