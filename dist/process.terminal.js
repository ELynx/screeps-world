'use strict'

const bootstrap = require('./bootstrap')

const Process = require('./process.template')

const terminalProcess = new Process('terminal')

const MaxBuyRoomDistance = 30
const MineralsToKeep = 30000

terminalProcess.work = function (room) {
  if (!room.my) return

  if (!room.terminal) return

  if (room.terminal.cooldown > 0) return

  if (room.terminal.store[RESOURCE_ENERGY] < 2) return

  // SELL SELL SELL
  const noPanic = room.memory.threat ? room.memory.threat < bootstrap.ThreatLevelMax : true

  let sellMineralType
  if (noPanic) {
    const minerals = room.find(FIND_MINERALS)
    if (minerals.length > 0) sellMineralType = minerals[0].mineralType
  } else {
    for (const key in room.terminal.store) {
      // STRATEGY do not sell out energy, it is needed for selling and other activities
      if (key !== RESOURCE_ENERGY && room.terminal.store.getUsedCapacity(key) > 0) {
        sellMineralType = key
        break
      }
    }
  }

  if (sellMineralType === undefined) return

  const has = room.terminal.store[sellMineralType]
  let toKeep = noPanic ? MineralsToKeep : 0

  if (has === undefined || has <= toKeep) return

  let priceMark = 0.95
  const range = MaxBuyRoomDistance

  // people seem to like H a lot, drive price up or stash
  if (sellMineralType === RESOURCE_HYDROGEN) {
    priceMark = 1.05

    if (has - toKeep > 1000) {
      toKeep = has - 1000
    }
  }

  if (!Memory.prices) {
    Memory.prices = { }
  }

  const lastPrice = Memory.prices[sellMineralType] || 0

  // get average order statistics
  const allBuyOrders = Game.market.getAllOrders({ type: ORDER_BUY, resourceType: sellMineralType })
  const allSellOrders = Game.market.getAllOrders({ type: ORDER_SELL, resourceType: sellMineralType })

  const goodBuyOrders = _.filter(allBuyOrders,
    function (order) {
      const roomFrom = Game.rooms[order.roomName]

      // don't trade with own orders
      // if room is not visible then definitely not own order
      // if room has no controller than definitely not own order
      // compare by username, avoid use of "my"
      if (roomFrom &&
          roomFrom.controller &&
          roomFrom.controller.owner &&
          roomFrom.controller.owner.username === room.terminal.owner.username) return false

      // STRATEGY allowed price drop per sell of room resources
      if (noPanic && (order.price < priceMark * lastPrice)) return false

      const dist = Game.map.getRoomLinearDistance(room.name, order.roomName, true)
      if (noPanic && (dist > range)) return false

      return true
    }
  )

  // derive smallest sell price
  let smallestPrice = Number.MAX_SAFE_INTEGER
  // derive biggest buy price
  let biggestPrice = 0

  for (let i = 0; i < goodBuyOrders.length; ++i) {
    const order = goodBuyOrders[i]

    if (order.price > biggestPrice) {
      biggestPrice = order.price
    }
  }

  for (let i = 0; i < allSellOrders.length; ++i) {
    const order = allSellOrders[i]

    const roomFrom = Game.rooms[order.roomName]

    // don't trade with own orders
    // see above for breakdown
    if (roomFrom &&
        roomFrom.controller &&
        roomFrom.controller.owner &&
        roomFrom.controller.owner.username === room.terminal.owner.username) continue

    if (order.price < smallestPrice) {
      smallestPrice = order.price
    }
  }

  // some bad orders
  if (noPanic && (biggestPrice <= smallestPrice)) {
    return
  }

  goodBuyOrders.sort(
    function (o1, o2) {
      if (o1.price !== o2.price) {
        return o2.price - o1.price
      }

      return Game.map.getRoomLinearDistance(room.name, o1.roomName, true) - Game.map.getRoomLinearDistance(room.name, o2.roomName, true)
    }
  )

  for (let i = 0; i < goodBuyOrders.length; ++i) {
    const rc = room.terminal.autoSell(goodBuyOrders[i], toKeep)

    if (rc === OK) {
      if (noPanic) {
        Memory.prices[goodBuyOrders[i].resourceType] = goodBuyOrders[i].price
      }

      break
    }
  }
}

terminalProcess.register()

module.exports = terminalProcess
