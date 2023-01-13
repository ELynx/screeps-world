'use strict';

var Process = require('process.template');

var terminalProcess = new Process('terminal');

const MaxBuyRoomDistance = 30;
const MineralsToKeep = 3000;

terminalProcess.work = function(room)
{
    this.debugHeader(room);

    if (!room.terminal)
    {
        return;
    }

    if (room.terminal.cooldown > 0)
    {
        return;
    }

    if (room.terminal.store[RESOURCE_ENERGY] < 2)
    {
        return;
    }

    const minerals = room.find(FIND_MINERALS);
    if (minerals.length == 0)
    {
        return;
    }

    // there is only one mineral type in a room
    const roomMineralType = minerals[0].mineralType;

    const has = room.terminal.store[roomMineralType];
    if (has === undefined || has <= MineralsToKeep)
    {
        return;
    }

    if (!Memory.prices)
    {
        Memory.prices = { };
    }

    const lastPrice = Memory.prices[roomMineralType] || 0;

    // TODO cache, two rooms may sell same stuff
    // get average order statistics
    const allBuyOrders  = Game.market.getAllOrders({ type: ORDER_BUY,  resourceType: roomMineralType });
    const allSellOrders = Game.market.getAllOrders({ type: ORDER_SELL, resourceType: roomMineralType });

    let goodBuyOrders = _.filter(allBuyOrders,
        function(order)
        {
            const roomFrom = Game.rooms[order.roomName];

            // don't trade with own orders
            if (roomFrom && roomFrom.controller && roomFrom.controller.my)
                return false;

            // STRATEGY allowed price drop per sell of room resources
            if (order.price < 0.95 * lastPrice)
                return false;

            const dist = Game.map.getRoomLinearDistance(room.name, order.roomName, true);
            if (dist > MaxBuyRoomDistance)
                return false;

            return true;
        }
    );

    // derive smallest sell price
    let smallestPrice = Number.MAX_SAFE_INTEGER;
    // derive biggest buy price
    let biggestPrice = 0;

    for (let i = 0; i < goodBuyOrders.length; ++i)
    {
        const order = goodBuyOrders[i];

        if (order.price > biggestPrice)
        {
            biggestPrice = order.price;
        }
    }

    for (let i = 0; i < allSellOrders.length; ++i)
    {
        const order = allSellOrders[i];

        const roomFrom = Game.rooms[order.roomName];

        // don't trade with own orders
        if (roomFrom && roomFrom.controller && roomFrom.controller.my)
            continue;

        if (order.price < smallestPrice)
        {
            smallestPrice = order.price;
        }
    }

    // some bad orders
    if (biggestPrice <= smallestPrice)
    {
        return;
    }

    goodBuyOrders.sort(
        function(o1, o2)
        {
            if (o1.price != o2.price)
            {
                return o2.price - o1.price;
            }

            return Game.map.getRoomLinearDistance(room.name, o1.roomName, true) - Game.map.getRoomLinearDistance(room.name, o2.roomName, true);
        }
    );

    for (let i = 0; i < goodBuyOrders.length; ++i)
    {
        const rc = room.terminal.autoSell(goodBuyOrders[i], MineralsToKeep);

        if (rc == OK)
        {
            Memory.prices[goodBuyOrders[i].resourceType] = goodBuyOrders[i].price;
            break;
        }
    }
};

terminalProcess.register();

module.exports = terminalProcess;
