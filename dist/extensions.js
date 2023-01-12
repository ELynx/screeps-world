'use strict';

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

Creep.prototype.withdrawFromAdjacentStructures = function(targets)
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

Creep.prototype.moveToWrapper = function(destination, options = { })
{
    if (options.plainCost === undefined)
        options.plainCost = 1;

    if (options.swampCost === undefined)
        options.swampCost = 5;

    return this.moveTo(destination, options);
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

    if (newValue >= 6)
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

    this._roomCreeps_  = undefined;
    this._creepCacheT_ = Game.time;
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

RoomPosition.prototype.squareArea = function(squareStep)
{
    const t = Math.max(this.y - squareStep, 0);
    const l = Math.max(this.x - squareStep, 0);
    const b = Math.min(this.y + squareStep, 49);
    const r = Math.min(this.x + squareStep, 49);

    return [ t, l, b, r ];
};

RoomPosition.prototype.findInSquareArea = function(lookForType, squareStep, filterFunction = undefined)
{
    const [t, l, b, r] = this.squareArea(squareStep);
    const items = Game.rooms[this.roomName].lookForAtArea(lookForType, t, l, b, r, true);

    for (let itemKey in items)
    {
        const item = items[itemKey][lookForType];

        if (filterFunction)
        {
            if (filterFunction(item))
            {
                return item.id;
            }            
        }
        else
        {
            return item.id;
        }
    }

    return undefined;
};

RoomPosition.prototype.hasInSquareArea = function(lookForType, squareStep, filterFunction = undefined)
{
    const id = this.findInSquareArea(lookForType, squareStep, filterFunction);
    return !(id === undefined);
};

RoomPosition.prototype.findSharedAdjacentPositions = function(otherRoomPosition)
{
    if (this.roomName != otherRoomPosition.roomName) return [];

    const adx = this.x - otherRoomPosition.x;
    const ady = this.y - otherRoomPosition.y;

    // there are no adjacent positions if positions are too far away
    if (Math.abs(adx) > 2 || Math.abs(ady) > 2) return [];

    const aroundAsMap = function(pos)
    {
        let result = {};

        for (let dx = -1; dx <= 1; ++dx)
        {
            for (let dy = -1; dy <= 1; ++dy)
            {
                if (dx == 0 && dy == 0) continue;

                const x = pos.x + dx;
                const y = pos.y + dy;

                if (x < 0 || x > 49 || y < 0 || y > 49) continue;

                result[(x + 1) + 100 * (y + 1)] = new RoomPosition(x, y, pos.roomName);
            }
        }

        return result;
    }

    const fromThis  = aroundAsMap(this);
    const fromOther = aroundAsMap(otherRoomPosition);

    const intersections = _.intersection(Object.keys(fromThis), Object.keys(fromOther));

    let result = [];
    for (let outerIndex in intersections)
    {
        const innerIndex = intersections[outerIndex];
        result.push(fromThis[innerIndex]);
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

Structure.prototype.getFromMemory = function(key)
{
    if (!Memory.structures) return undefined;

    if (!Memory.structures[this.id]) return undefined;

    return Memory.structures[this.id][key];
};

Structure.prototype.setToMemory = function(key, value)
{
    if (!Memory.structures) Memory.structures = { };

    if (!Memory.structures[this.id]) Memory.structures[this.id] = { };

    Memory.structures[this.id][key] = value;
};

const _isSourceKey_ = 'isSource';

StructureLink.prototype.isSource = function()
{
    let result = this.getFromMemory(_isSourceKey_);

    if (result === undefined)
    {
        result = this.pos.hasInSquareArea(LOOK_SOURCES, 2);
        this.setToMemory(_isSourceKey_, result);
    }

    return result;
};

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

        return Game.market.deal(order.id, amount, this.pos.roomName);
    }

    return ERR_INVALID_ARGS;
};
