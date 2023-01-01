'use strict';

var Process = require('process.template');
var globals = require('globals');

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

    let roomMineralType = minerals[mineralIndex].mineralType;

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
    const allOrders = Game.market.getAllOrders(
        function(order)
        {
            if (order.resourceType != roomMineralType)
                return false;

            const roomFrom = Game.rooms[order.roomName];

            // don't trade with self
            if (roomFrom && roomFrom.controller && roomFrom.controller.my)
                return false;

            if (order.type == ORDER_BUY)
            {
                if (order.price < 0.95 * lastPrice)
                    return false;

                const dist = Game.map.getRoomLinearDistance(room.name, order.roomName, true);
                if (dist > MaxBuyRoomDistance)
                    return false;
            }

            return true;
        }
    );

    // derive smallest sell price
    let smallestPrice = Number.MAX_SAFE_INTEGER;
    // derive biggest buy price
    let biggestPrice = 0;

    for (let i = 0; i < allOrders.length; ++i)
    {
        const order = allOrders[i];

        if (order.type == ORDER_BUY)
        {
            if (order.price > biggestPrice)
            {
                biggestPrice = order.price;
            }
        }
        else
        {
            if (order.price < smallestPrice)
            {
                smallestPrice = order.price;
            }
        }
    }

    // some bad orders
    if (biggestPrice <= smallestPrice)
    {
        return;
    }

    let buyOrders = _.filter(allOrders, function(order) { return order.type == ORDER_BUY; });

    buyOrders.sort(
        function(o1, o2)
        {
            if (o1.price != o2.price)
            {
                return o2.price - o1.price;
            }

            return Game.map.getRoomLinearDistance(room.name, o1.roomName, true) - Game.map.getRoomLinearDistance(room.name, o2.roomName, true);
        }
    );

    for (let i = 0; i < buyOrders.length; ++i)
    {
        const rc = globals.autoSell(buyOrders[i].id, room.name, MineralsToKeep);

        if (rc == OK)
        {
            Memory.prices[buyOrders[i].resourceType] = buyOrders[i].price;
            break;
        }
    }
};

terminalProcess.register();

module.exports = terminalProcess;
