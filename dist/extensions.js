'use strict';

Creep.prototype.sumCarry = function()
{
    return _.sum(this.carry);
};

Creep.prototype.hasEnergy = function()
{
    return this.carry.energy > 0;
};

Creep.prototype.caveIndex = function()
{
    if (this._cidxT_ === undefined ||
        this._cidxT_ != Game.time)
    {
        let cidx = 0;

        const caveMap = this.room.memory.caveMap;
        if (caveMap)
        {
            for (let x = 0; x < caveMap[0].length - 1; ++x)
            {
                if (this.pos.x >= caveMap[0][x] &&
                    this.pos.x <  caveMap[0][x + 1])
                {
                    cidx = x;
                    break;
                }
            }

            for (let y = 0; y < caveMap[1].length - 1; ++y)
            {
                if (this.pos.y >= caveMap[1][y] &&
                    this.pos.y <  caveMap[1][y + 1])
                {
                    cidx = cidx + (caveMap[0].length - 1) * y;
                    break;
                }
            }
        }

        this._cidx_ = cidx;
        this._cidxT_ = Game.time;
    }

    return this._cidx_;
};

/**
@return Game object creep is targeted to.
**/
Creep.prototype.target = function()
{
    return Game.getObjectById(this.memory.dest);
};

/**
@param {array<Creep>} creeps to heal.
**/
Creep.prototype.healClosest = function(creeps)
{
    if (creeps.length == 0)
    {
        return;
    }

    const target = this.pos.findClosestByRange(creeps);
    if (target)
    {
        if (this.pos.isNearTo(target))
        {
            return this.heal(target);
        }
        else
        {
            return this.rangedHeal(target);
        }
    }

    return ERR_NOT_FOUND;
};

/**
@param {array<Creep>} creeps to heal.
**/
Creep.prototype.healAdjacent = function(creeps)
{
    for (let i = 0; i < creeps.length; ++i)
    {
        const target = creeps[i];
        if (this.pos.isNearTo(target))
        {
            return this.heal(target);
        }
    }

    return ERR_NOT_FOUND;
};

Creep.prototype.withdrawFromAdjacentEnemyStructures = function(targets)
{
    for (let target in targets)
    {
        if (target.structureType &&
            target.store &&
            target.store[RESOURCE_ENERGY] > 0 &&
            this.pos.isNearTo(target))
        {
            if (this.withdraw(target, RESOURCE_ENERGY) == OK)
            {
                return OK;
            }
        }
    }

    return ERR_NOT_FOUND;
};

Flag.prototype.getValue = function()
{
    if (this.color == COLOR_PURPLE)
    {
        return 6;
    }
    else if (this.color == COLOR_RED)
    {
        return 3;
    }
    else if (this.color == COLOR_YELLOW)
    {
        return 2;
    }
    else if (this.color == COLOR_GREEN)
    {
        return 1;
    }
    else if (this.color == COLOR_BLUE)
    {
        return 0;
    }

    return -1;
};

Flag.prototype.setValue = function(newValue)
{
    let newColor = COLOR_WHITE;

    if (newValue == 6)
    {
        newColor = COLOR_PURPLE;
    }
    else if (newValue == 3)
    {
        newColor = COLOR_RED;
    }
    else if (newValue == 2)
    {
        newColor = COLOR_YELLOW;
    }
    else if (newValue == 1)
    {
        newColor = COLOR_GREEN;
    }
    else if (newValue == 0)
    {
        newColor = COLOR_BLUE;
    }

    if (this.color != newColor)
    {
        this.setColor(newColor, this.secondaryColor);
    }
};

Flag.prototype.setSecondaryColor = function(newColor)
{
    if (this.secondaryColor == newColor)
    {
        return;
    }

    this.setColor(this.color, newColor);
};

Flag.prototype.resetSecondaryColor = function()
{
    if (this.color == this.secondaryColor)
    {
        return;
    }

    this.setColor(this.color, this.color);
};

Room.prototype.roomDebug = function(what)
{
    if (this._verboseT_ === undefined ||
        this._verboseT_ != Game.time)
    {
        this._debugY_ = 1.5;
        this._verboseT_ = Game.time;
    }

    this.visual.text(what, 0, this._debugY_++, { align: 'left' });
};

Room.prototype._clearCreepCacheIfOld = function()
{
    if (this._creepCacheT_ && this._creepCacheT_ == Game.time)
    {
        return;
    }

    this._hostileCreeps_ = undefined;
    this._myCreeps_      = undefined;
    this._roomCreeps_    = undefined;
    this._creepCacheT_   = Game.time;
}

/**
Get a list of hostile creeps in a room, cached
**/
Room.prototype.getHostileCreeps = function()
{
    this._clearCreepCacheIfOld();

    if (this._hostileCreeps_ === undefined)
    {
        this._hostileCreeps_ = this.find(FIND_HOSTILE_CREEPS);
    }

    return this._hostileCreeps_;
};

/**
Get a list of my creeps in a room, cached
**/
Room.prototype.getMyCreeps = function()
{
    this._clearCreepCacheIfOld();

    if (this._myCreeps_ === undefined)
    {
        this._myCreeps_ = this.find(FIND_MY_CREEPS);
    }

    return this._myCreeps_;
};

/**
Get a list of creeps assigned to a room, cached
**/
Room.prototype.getRoomControlledCreeps = function()
{
    this._clearCreepCacheIfOld();

    if (this._roomCreeps_ === undefined)
    {
        let self = this;

        this._roomCreeps_ = _.filter(
            Game.creeps,
            function(creep, name)
            {
                // skip tasked
                if (creep.memory.flag) return false;

                return creep.memory.crum == self.name;
            }
        );
    }

    return this._roomCreeps_;
};

/**
Get number of walkable tiles around a position.
@return {integer} number of walkable tiles.
**/
RoomPosition.prototype.walkableTiles = function()
{
    let result = 0;

    const room = Game.rooms[this.roomName];
    if (room)
    {
        const t = this.y > 0  ? this.y - 1 : 0;
        const l = this.x > 0  ? this.x - 1 : 0;
        const b = this.y < 49 ? this.y + 1 : 49;
        const r = this.x < 49 ? this.x + 1 : 49;

        const around = room.lookAtArea(t, l, b, r);

        for (let x in around)
        {
            const ys = around[x];

            for (let y in ys)
            {
                if (x == this.x && y == this.y)
                {
                    continue;
                }

                const objs = ys[y];

                if (objs)
                {
                    let found = false;

                    for (let i = 0; i < objs.length && !found; ++i)
                    {
                        const obj = objs[i];

                        if (obj.type == LOOK_TERRAIN)
                        {
                            if (obj.terrain == 'plain' ||
                                obj.terrain == 'swamp')
                            {
                                found = true;
                            }
                        }

                        if (obj.type == LOOK_STRUCTURES)
                        {
                            if (obj.structure.structureType == STRUCTURE_ROAD)
                            {
                                found = true;
                            }
                        }
                    }

                    if (found)
                    {
                        ++result;
                    }
                }
            }
        }
    }

    return result;
};

Structure.prototype.isActiveSimple = function()
{
    // if special flag is set on the room
    if (this.room.memory.noSimple)
    {
        return this.isActive();
    }

    // simple strategy, this is most likely any way
    return true;
};

StructureLink.prototype.isSource = function()
{
    if (this._isSource_ === undefined)
    {
        let sources = this.pos.findInRange(FIND_SOURCES, 2);
        this._isSource_ = sources.length > 0;
    }

    return this._isSource_;
};

/**
Get amount that can be sent for given energy.
@see Game.market.calcTransactionCost
@param {integer} energy how much can be spent on transaction.
@param {string} roomName1 room 1.
@param {string} roomName2 room 2.
@return how much can be sent.
**/
StructureTerminal.prototype._caclTransactionAmount = function(roomTo)
{
    // how much sending 1000 costs
    const c1000 = Game.market.calcTransactionCost(1000, this.room.name, roomTo);
    if (c1000 == 0)
    {
        return 0;
    }

    // how many times 1000 can be sent
    const energy = this.store[RESOURCE_ENERGY];
    const times = energy / c1000;

    // how many can be sent
    return Math.floor(1000 * times);
};

/**
Try to sell as much as possible for order.
@param {Order} order to be sold to.
@param {integer} keep = 0 how many to keep at terminal.
@return result of deal or other error codes.
**/
StructureTerminal.prototype.autoSell = function(order, keep = 0)
{
    if (order.type == ORDER_BUY)
    {
        const has = this.store[order.resourceType];
        if (has === undefined || has <= keep)
        {
            return ERR_NOT_ENOUGH_RESOURCES;
        }

        const maxAmount = this._caclTransactionAmount(order.roomName);

        if (maxAmount < 1)
        {
            return ERR_NOT_ENOUGH_ENERGY;
        }

        const amount = Math.min(has - keep, maxAmount, order.amount);

        return Game.market.deal(orderId, amount, room.name);
    }

    return ERR_INVALID_ARGS;
}
