'use strict';

var globals =
{
    /**
    CPU used from hard shard limit.
    @return integer percent of used shard limit.
    **/
    hardCpuUsed: function(from)
    {
        if (!Game.cpu.limit)
        {
            return 0;
        }

        return Math.ceil(100 * (Game.cpu.getUsed() - from) / Game.cpu.limit);
    },

    /**
    CPU used from shard limit and bucket.
    @return integer percent of used shard limit and bucket.
    **/
    softCpuUsed: function(from)
    {
        if (!Game.cpu.tickLimit)
        {
            return 0;
        }

        return Math.ceil(100 * (Game.cpu.getUsed() - from) / Game.cpu.tickLimit);
    },

    /**
    Object holding references to all registered room controllers.
    **/
    roomControllers: { },

    /**
    Object holding references to room controllers that want to prepare for the room.
    **/
    roomControllersPrepare: { },

    /**
    Object holding references to room controllers that care for their creeps.
    **/
    roomControllersObserveOwn: { },

    /**
    Object holding references to room controllers that care for all creeps.
    **/
    roomControllersObserveAll: { },

    /**
    Add a controller to list of room controllers.
    @param {Controller} controller
    **/
    registerRoomController: function(controller)
    {
        this.roomControllers[controller.id] = controller;

        if (controller.roomPrepare)
        {
            this.roomControllersPrepare[controller.id] = controller;
        }

        if (controller.observeMyCreep)
        {
            this.roomControllersObserveOwn[controller.id] = controller;
        }

        if (controller.observeAllCreeps)
        {
            this.roomControllersObserveAll[controller.id] = controller;
        }
    },

    NO_CONTROL: '',
    NO_DESTINATION: '',
    NO_ACT_RANGE: undefined,
    NO_EXTRA: undefined,

    /**
    @param {Creep} creep.
    @return If creep is assigned to a controller.
    **/
    creepAssigned: function(creep)
    {
        return creep.memory.ctrl != this.NO_CONTROL && !creep.spawning;
    },

    /**
    @param {Creep} creep.
    @return If creep is not assigned to a controller.
    **/
    creepNotAssigned: function(creep)
    {
        return creep.memory.ctrl == this.NO_CONTROL && !creep.spawning;
    },

    /**
    Assign creep to a target with controller.
    @param {Controller} controller.
    @param {???} target.
    @param {Creep} creep.
    **/
    assignCreep: function(controller, target, creep, extra)
    {
        creep.memory.ctrl = controller.id;
        creep.memory.dest = target.id;
        creep.memory.dact = controller.actRange;
        creep.memory.xtra = extra;
    },

    /**
    Unassign creep from target or controller.
    @param {Creep} creep.
    **/
    unassignCreep: function(creep)
    {
        creep.memory.ctrl = this.NO_CONTROL;
        creep.memory.dest = this.NO_DESTINATION;
        creep.memory.dact = this.NO_ACT_RANGE;
        creep.memory.xtra = this.NO_EXTRA;
    },

    /**
    Get amount that can be sent for present energy.
    @see Game.market.calcTransactionCost
    **/
    caclTransactionAmount: function(energy, roomName1, roomName2)
    {
        // how much sending 1000 costs
        const c1000 = Game.market.calcTransactionCost(1000, roomName1, roomName2);
        if (c1000 == 0)
        {
            return 0;
        }

        // how many times 1000 can be sent
        const times = energy / c1000;

        // how many thousands can be sent
        return Math.floor(1000 * times);
    },

    maxSell: function(orderId, roomName)
    {
        const order = Game.market.getOrderById(orderId);
        if (order && order.type == ORDER_BUY)
        {
            const room = Game.rooms[roomName];
            if (room && room.terminal)
            {
                const has = room.terminal.store[order.resourceType];
                if (has === undefined)
                {
                    return ERR_NOT_ENOUGH_RESOURCES;
                }

                const energy = room.terminal.store[RESOURCE_ENERGY];
                const maxAmount = this.caclTransactionAmount(energy, room.name, order.roomName);

                if (maxAmount < 1)
                {
                    return ERR_NOT_ENOUGH_ENERGY;
                }

                const amount = Math.min(has, maxAmount, order.amount);

                return Game.market.deal(orderId, amount, room.name);
            }

            return ERR_INVALID_ARGS;
        }

        return ERR_NOT_FOUND;
    }
};

module.exports = globals;
