'use strict';

var extensions    = require('extensions');
var cleanupMemory = require('routine.memory');
var roomActor     = require('actor.room');
var manualStrelok = require('manual.strelok');
var manualClaim   = require('manual.claim');
//const profiler  = require('screeps-profiler');

console.log('T: ' + Game.time + ' Loading took ' + Game.cpu.getUsed() + ' CPU');

//profiler.enable();

module.exports.loop = function()
{
    //console.log('Hard limit ' + Game.cpu.limit);
    //console.log('Soft limit ' + Game.cpu.tickLimit);
    //console.log('Bucket     ' + Game.cpu.bucket);

    //profiler.wrap(function() {

    cleanupMemory();

    for(const name in Game.rooms)
    {
        const room = Game.rooms[name];

        roomActor.act(room);
    }

    //});

    manualStrelok();
    manualClaim();

    // free market
    // <<
    if (Memory.order && Memory.stopPrice)
    {
        if (Game.rooms['E38N1'].terminal.cooldown == 0 &&
            Game.rooms['E38N1'].terminal.storage[RESOURCE_ENERGY] > 200)
        {
            var stopIt = true;

            const orderInfo = Game.market.getOrderById(Memory.order);
            if (orderInfo)
            {
                if (orderInfo.price < Memory.stopPrice)
                {
                    const buy = Math.random() < 0.16;

                    if (buy)
                    {
                        stopIt = false;

                        Game.market.deal(Memory.order, 1000, 'E38N1');
                    }
                    else
                    {
                        const allOrders = Game.market.getAllOrders(
                            function(order)
                            {
                                return order.type == ORDER_BUY &&
                                       order.resourceType == orderInfo.resourceType &&
                                       order.price > 2 * orderInfo.price &&
                                       Game.map.getRoomLinearDistance(order.roomName, 'E38N1', true) < 30;
                            }
                        );

                        if (allOrders.length > 0)
                        {
                            allOrders.sort(
                                function(o1, o2)
                                {
                                    if (o1.price == o2.price)
                                    {
                                        return Game.map.getRoomLinearDistance(o1.roomName, 'E38N1', true) - Game.map.getRoomLinearDistance(o2.roomName, 'E38N1', true);
                                    }

                                    return o2.price - o1.price;
                                }
                            );

                            for (var i = 0; i < allOrders.length; ++i)
                            {
                                if (Game.market.deal(allOrders[i].id, 500, 'E38N1') == OK)
                                {
                                    break;
                                }
                            }

                            stopIt = false;
                        }
                    }
                }
            }

            if (stopIt)
            {
                delete Memory.order;
                delete Memory.stopPrice;
            }
        }
    }
    // >>

    //console.log('Used       ' + Game.cpu.getUsed());
}
