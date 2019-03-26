'use strict';

Creep.prototype.sumCarry = function()
{
    return _.sum(this.carry);
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
                if (pos.x >= caveMap[0][x] &&
                    pos.x <  caveMap[0][x + 1])
                {
                    cidx = x;
                    break;
                }
            }

            for (var y = 0; y < caveMap[1].length - 1; ++y)
            {
                if (pos.y >= caveMap[1][y] &&
                    pos.y <  caveMap[1][y + 1])
                {
                    cidx = cidx + (caveMap[0].length - 1) * y;
                    break;
                }
            }
        }

        this._cidx_ = cidx;
        this._cidxT_ = Game.time;
    }

    return this_.cidx_;
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

        room.visual.text(what, 0, this._debugY_++, { align: 'left' });
    }
};
