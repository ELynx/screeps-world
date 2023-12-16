'use strict'

const bootstrap = require('./bootstrap')

const bodywork = require('./routine.bodywork')
const queue = require('./routine.spawn')

const Process = require('./process.template')

// STRATEGY how many room creeps
const spawnProcess = new Process('spawn')

spawnProcess.makeKey = function (roomName, type) {
  return type + '_' + roomName
}

spawnProcess._addToQueue = function (roomToName, roomFromName, type, body, memoryAddon, n, adderFunction) {
  const key = this.makeKey(roomToName, type)

  const memory =
    {
      crum: roomToName,
      ctrl: bootstrap.NO_CONTROL,
      dest: bootstrap.NO_DESTINATION,
      dact: bootstrap.NO_ACT_RANGE,
      xtra: bootstrap.NO_EXTRA,
      btyp: type
    }
  _.assign(memory, memoryAddon)

  adderFunction(
    key, // id in queue
    body, // body function or concrete formula
    key, // name prefix
    memory, // memory
    roomFromName, // from
    roomToName, // to
    n // how much to add
  )
}

spawnProcess._eraseFromQueue = function (roomToName, type) {
  const key = this.makeKey(roomToName, type)
  queue.erase(key)
}

spawnProcess.addToQueue = function (roomToName, roomFromName, type, body, memory, n, priority) {
  if (n < 0) {
    this._eraseFromQueue(roomToName, type)
  }

  if (n <= 0) {
    return
  }

  if (priority === 'urgent') {
    this._addToQueue(roomToName, roomFromName, type, body, memory, n, _.bind(queue.addUrgent, queue))
  } else if (priority === 'normal') {
    this._addToQueue(roomToName, roomFromName, type, body, memory, n, _.bind(queue.addNormal, queue))
  } else if (priority === 'lowkey') {
    this._addToQueue(roomToName, roomFromName, type, body, memory, n, _.bind(queue.addLowkey, queue))
  }
}

spawnProcess._hasAndPlanned = function (room, live, type) {
  const has = live[type] ?? 0
  const planned = queue.count(this.makeKey(room.name, type))

  return has + planned
}

spawnProcess._canSpawn = function (room) {
  return room.extendedAvailableEnergyCapacity() > 0
}

spawnProcess.streloks = function (room, live) {
  const threat = room.memory.threat ?? 0
  if (threat <= bootstrap.ThreatLevelLow) return

  const want = threat
  const now = this._hasAndPlanned(room, live, 'strelok')

  this.addToQueue(
    room.name,
    this._canSpawn(room) ? room.name : queue.FROM_CLOSEST_ROOM,
    'strelok',
    'strelok',
    {
      flag: 'strelok_x_' + room.name
    },
    want - now,
    'normal'
  )
}

spawnProcess.restockers = function (room, live) {
  const want = room.memory.slvl ?? 0
  const now = this._hasAndPlanned(room, live, 'restocker')

  this.addToQueue(
    room.name,
    this._canSpawn(room) ? room.name : queue.FROM_CLOSEST_ROOM,
    'restocker',
    room._my_ ? 'restocker_my' : 'restocker_other',
    {
      rstk: true
    },
    want - now,
    'normal'
  )
}

spawnProcess.miners = function (room, live) {
  const want = room.memory.mlvl ?? 0
  const now = this._hasAndPlanned(room, live, 'miner')

  this.addToQueue(
    room.name,
    this._canSpawn(room) ? room.name : queue.FROM_CLOSEST_ROOM,
    'miner',
    'miner',
    {
      minr: true
    },
    want - now,
    'lowkey'
  )
}

spawnProcess.workers = function (room, live, limit = undefined) {
  const nowWorkers = this._hasAndPlanned(room, live, 'worker')

  const workerBody = bodywork.worker(room)

  let wantWorkers

  if (room._my_ && limit === undefined) {
    let standalone = 0
    let supportedByRestockers = 0

    const nowRestockers = this._hasAndPlanned(room, live, 'restocker')

    if (nowRestockers !== 0) {
      const restockerBody = room._my_ ? bodywork.restocker_my(room) : bodywork.restocker_other(room)
      const workInRestocker = _.countBy(restockerBody)[WORK] ?? 0
      if (workInRestocker > 0) {
        const workInWorker = _.countBy(workerBody)[WORK] ?? 0
        if (workInWorker > 0) {
          // STRATEGY harvest to spend ratio
          supportedByRestockers = Math.round(1.2 * HARVEST_POWER * nowRestockers * workInRestocker / workInWorker)
        }
      }
    }

    if (supportedByRestockers <= 0) {
      standalone = room.memory.hlvl
    }

    wantWorkers = Math.max(standalone, supportedByRestockers)
  } else {
    // demand until limit is reached
    wantWorkers = nowWorkers + 1
  }

  const wantWorkersMin = limit ? 0 : 3
  const wantWorkersMax = limit || 12

  const want = Math.max(wantWorkersMin, Math.min(wantWorkers, wantWorkersMax))

  const roomCanSpawn = this._canSpawn(room)

  this.addToQueue(
    room.name,
    roomCanSpawn ? room.name : queue.FROM_CLOSEST_ROOM,
    'worker',
    roomCanSpawn ? 'worker' : workerBody,
    { },
    want - nowWorkers,
    'normal'
  )
}

spawnProcess.plunders = function (room, live) {
  const want = this._hasAndPlanned(room, live, 'restocker')
  const now = this._hasAndPlanned(room, live, 'plunder')

  this.addToQueue(
    room.name,
    queue.FROM_CLOSEST_ROOM,
    'plunder',
    'plunder',
    {
      frum: room.name,
      flag: 'plunder_x_' + room.name
    },
    want - now,
    'lowkey'
  )
}

spawnProcess.my = function (room, live) {
  this.streloks(room, live)
  this.restockers(room, live)
  this.miners(room, live)
  this.workers(room, live)
}

spawnProcess.myReserved = function (room, live) {
  this.streloks(room, live)
  this.restockers(room, live)
  this.plunders(room, live)
}

spawnProcess.sourceKeeper = function (room, live) {
  // nothing for sourceKeeper now
}

spawnProcess.unowned = function (room, live) {
  this.streloks(room, live)
  this.restockers(room, live)
  this.plunders(room, live)
}

spawnProcess.ally = function (room, live) {
  this.workers(room, live, 1)
}

spawnProcess.neutral = function (room, live) {
  this.workers(room, live, 1)
}

spawnProcess.hostile = function (room, live) {
  // nothing for hostile now
}

spawnProcess.work = function (room) {
  const live = _.countBy(room.getViableRoomOwnedCreeps(), 'memory.btyp')

  // controller is `my`
  if (room._my_) this.my(room, live)
  // controller is own reserved
  else if (room.myReserved()) this.myReserved(room, live)
  // room is source keeper room
  else if (room.sourceKeeper()) this.sourceKeeper(room, live)
  // room has no controller / controller is not owned
  else if (room.unowned) this.unowned(room, live)
  // controller is ally or reserved by ally
  else if (room.ally) this.ally(room, live)
  // controller is neutral or reserved by neutral
  else if (room.neutral) this.neutral(room, live)
  // controller is hostile or reserved by hostile
  else if (room.hostile) this.hostile(room, live)
}

spawnProcess._registerBodyFunction = function (routineId) {
  const routine = bodywork[routineId]
  const bound = _.bind(routine, bodywork)

  queue.registerBodyFunction(routineId, bound)
}

spawnProcess.registerBodyFunctions = function () {
  this._registerBodyFunction('worker')
  this._registerBodyFunction('restocker_my')
  this._registerBodyFunction('restocker_other')
  this._registerBodyFunction('miner')
}

spawnProcess.register = function () {
  this._register()
  this.registerBodyFunctions()
}

spawnProcess.register()

module.exports = spawnProcess
