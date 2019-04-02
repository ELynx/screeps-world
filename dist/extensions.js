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
    if (!this._cidxT_ ||
         this._cidxT_ != Game.time)
    {
        var cidx = 0;

        const caveMap = this.room.memory.caveMap;
        if (caveMap)
        {
            for (var x = 0; x < caveMap[0].length - 1; ++x)
            {
                if (this.pos.x >= caveMap[0][x] &&
                    this.pos.x <  caveMap[0][x + 1])
                {
                    cidx = x;
                    break;
                }
            }

            for (var y = 0; y < caveMap[1].length - 1; ++y)
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

        //this.say(this._cidx_);
    }

    return this._cidx_;
};

/**
@param {Creep} creep.
@return IGame object creep is targeted to.
**/
Creep.prototype.target = function()
{
    return Game.getObjectById(this.memory.dest);
};

Room.prototype._verbose_ = false;

Room.prototype.roomDebug = function(what)
{
    if (this._verbose_)
    {
        if (!this._debugY_ ||
            !this._verboseT_ ||
             this._verboseT_ != Game.time)
        {
            this._debugY_ = 0;
            this._verboseT_ = Game.time;
        }

        this.visual.text(what, 0, this._debugY_++, { align: 'left' });
    }
};

/**
Get number of walkable tiles around a position.
@return {integer} number of walkable tiles.
**/
RoomPosition.prototype.walkableTiles = function()
{
    var result = [];

    const room = Game.rooms[this.roomName];
    if (room)
    {
        const t = this.y > 0  ? this.y - 1 : 0;
        const l = this.x > 0  ? this.x - 1 : 0;
        const b = this.y < 49 ? this.y + 1 : 49;
        const r = this.x < 49 ? this.x + 1 : 49;

        const around = room.lookAtArea(t, l, b, r);

        for (var x in around)
        {
            const ys = around[x];

            for (var y in ys)
            {
                if (x == this.x && y == this.y)
                {
                    continue;
                }

                const objs = ys[y];

                if (objs)
                {
                    var found = false;

                    for (var i = 0; i < objs.length && !found; ++i)
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
                        result.push(new RoomPosition(x, y, this.roomName));
                    }
                }
            }
        }
    }

    // TODO just result
    return result.length;
};

StructureLink.prototype.isSource = function()
{
    if (this._isSource_ !== undefined)
    {
        return this._isSource_;
    }

    let sources = this.pos.findInRange(FIND_SOURCES, 2);
    this._isSource_ = sources.length > 0;

    return this._isSource_;
};
