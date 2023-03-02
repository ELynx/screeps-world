'use strict'

const queue = require('./routine.spawn')
const intent = require('./routine.intent')

const Tasked = require('./tasked.template')

const spawn = new Tasked('spawn')

spawn._maxEnergyCapacity = function () {
  if (Game.__maxEnergyCapacity) return Game.__maxEnergyCapacity

  Game.__maxEnergyCapacity = 0

  for (const name in Game.spawns) {
    const roomCapacity = Game.spawns[name].room.extendedAvailableEnergyCapacity()

    if (Game.__maxEnergyCapacity < roomCapacity) {
      Game.__maxEnergyCapacity = roomCapacity
    }
  }

  return Game.__maxEnergyCapacity
}

spawn._bodyCost = function (body) {
  const usedBody = (body.length > MAX_CREEP_SIZE) ? body.slice(0, MAX_CREEP_SIZE) : body

  const costArray = _.map(
    usedBody,
    function (type) {
      return BODYPART_COST[type] || 1000000
    }
  )

  return _.sum(costArray)
}

/**
 * Should model be dismissed from spawn process
 **/
spawn.dismiss = function (model) {
  // sanitize old models
  if (model._time < Game.time - CREEP_LIFE_TIME) {
    return true
  }

  // sanitize deleted flags
  if (model.memory && model.memory.flag) {
    const flag = Game.flags[model.memory.flag]
    if (flag === undefined) {
      return true
    }
  }

  // sanitize too expensive preset models
  if (_.isArray(model.body)) {
    const maxCost = this._maxEnergyCapacity()
    const bodyCost = this._bodyCost(model.body)

    if (bodyCost > maxCost) {
      console.log('spawn.dismiss found model [' + model.name + '] of body ' + model.body + ' and cost ' + bodyCost + ' with max capacity ' + maxCost)
      return true
    }
  }

  return false
}

spawn._peekOrGet = function (queueCall) {
  // prevent forever loop
  let maxAttempts = 10
  while (maxAttempts > 0) {
    --maxAttempts

    const inQueue = queueCall()
    if (inQueue === undefined) {
      return undefined
    } else {
      if (this.dismiss(inQueue)) {
        queue.get() // dispose of element
        continue // to next queueCall
      }

      return inQueue
    }
  }

  console.log('spawn._peekOrGet only cleanup duty on ' + Game.time)

  return undefined
}

spawn._queueCallPeek = function () {
  return queue.peek()
}

spawn._queueCallGet = function () {
  return queue.get()
}

spawn.peek = function () {
  return this._peekOrGet(this._queueCallPeek)
}

spawn.get = function () {
  return this._peekOrGet(this._queueCallGet)
}

spawn.postpone = function () {
  return queue.postpone()
}

spawn._spawnsCanSpawn = function () {
  if (Game.__spawnsCanSpawn) return Game.__spawnsCanSpawn

  const spawns = _.filter(
    Game.spawns,
    function (spawn) {
      const spawning = intent.getSpawnSpawning(spawn)
      return spawning === null && spawn.isActiveSimple
    }
  )

  Game.__spawnsCanSpawn = spawns

  return spawns
}

spawn._spawnsByLevel = function () {
  if (Game.__spawnsByLevel) return Game.__spawnsByLevel

  const spawns = this._spawnsCanSpawn().slice(0)
  spawns.sort(
    function (spawn1, spawn2) {
      return spawn2.room.level() - spawn1.room.level()
    }
  )

  Game.__spawnsByLevel = spawns

  return spawns
}

spawn._spawnsByDistance = function (roomName) {
  if (Game.__spawnsByDistance) {
    const cached = Game.__spawnsByDistance[roomName]
    if (cached) return cached
  }

  const spawns = this._spawnsCanSpawn().slice(0)
  spawns.sort(
    function (spawn1, spawn2) {
      const d1 = Game.map.getRoomLinearDistance(spawn1.room.name, roomName)
      const d2 = Game.map.getRoomLinearDistance(spawn2.room.name, roomName)

      // if distance is different, favor distance
      if (d1 !== d2) {
        return d1 - d2
      }

      // if distance is same, sort by power inside
      return spawn2.room.level() - spawn1.room.level()
    }
  )

  if (Game.__spawnsByDistance === undefined) {
    Game.__spawnsByDistance = { }
  }

  Game.__spawnsByDistance[roomName] = spawns

  return spawns
}

spawn._spawnsInRoom = function (roomName) {
  if (Game.__spawnsInRoom) {
    const cached = Game.__spawnsInRoom[roomName]
    if (cached) return cached
  }

  const room = Game.rooms[roomName]
  const spawns = room ? _.values(room.spawns) : []

  if (Game.__spawnsInRoom === undefined) {
    Game.__spawnsInRoom = { }
  }

  Game.__spawnsInRoom[roomName] = spawns

  return spawns
}

spawn.makeBody = function (spawn, model) {
  if (_.isArray(model.body)) {
    return model.body
  }

  if (_.isString(model.body)) {
    const bodyFunction = queue.getBodyFunction(model.body)
    if (bodyFunction === undefined) return undefined

    return bodyFunction(spawn.room)
  }

  return undefined
}

spawn.spawnNextErrorHandler = function (spawn, model, index, rc = undefined) {
  let message =
        'spawn.spawnNext error condition [' + index +
        '] detected for [' + JSON.stringify(model) +
        '] at room [' + spawn.room.name + '] spawn [' + spawn.name + ']'

  if (rc) {
    message += ' with rc [' + rc + ']'
  }

  console.log(message)

  // dispose of model
  queue.get()

  // try next model
  return true
}

spawn.spawnNext = function () {
  // not known if model can be spawned
  const nextModel = this.peek()

  // queue is empty
  if (nextModel === undefined) return false

  let spawns

  if (nextModel.from === queue.FROM_ANY_ROOM) {
    spawns = _.shuffle(this._spawnsCanSpawn())
  } else if (nextModel.from === queue.FROM_CLOSEST_ROOM) {
    spawns = this._spawnsByDistance(nextModel.to)
  } else if (nextModel.from === queue.FROM_STRONGEST_ROOM) {
    spawns = this._spawnsByLevel()
  } else {
    spawns = _.shuffle(this._spawnsInRoom(nextModel.from))
  }

  if (spawns.length === 0) return false

  if (spawns.length > 1 && nextModel.priority === 'lowkey') {
    if (nextModel.from === queue.FROM_CLOSEST_ROOM ||
        nextModel.from === queue.FROM_STRONGEST_ROOM) {
      const firstRoomName = spawns[0].room.name

      // TODO spawn from strongest only
      // TODO spawn from closest only

      spawns = _.takeWhile(spawns, _.matchesProperty('room.name', firstRoomName))
    }
  }

  for (let i = 0; i < spawns.length; ++i) {
    const spawn = spawns[i]

    const body = this.makeBody(spawn, nextModel)
    if (body === undefined) {
      return this.spawnNextErrorHandler(spawn, nextModel, 1)
    }

    if (body.length === 0) {
      continue // not enough power, next spawn
    }

    const actualRunRc = intent.wrapSpawnIntent(
      spawn,
      'spawnCreep',
      body,
      nextModel.name,
      {
        memory: nextModel.memory,
        directions: [TOP, TOP_RIGHT, RIGHT, BOTTOM_RIGHT, BOTTOM, BOTTOM_LEFT, LEFT, TOP_LEFT]
      }
    )

    if (actualRunRc === ERR_NOT_ENOUGH_ENERGY) {
      continue // to next spawn
    }

    if (actualRunRc < OK) {
      return this.spawnNextErrorHandler(spawn, nextModel, 2, actualRunRc)
    }

    // remove the model
    queue.get()

    return true
  } // end of loop for spawns

  // maybe move model in queue
  // if movement was successful, try next one
  return this.postpone()
}

spawn.act = function () {
  // STRATEGY spawn attempts per tick
  let maxAttempts = Object.keys(Game.rooms) * 2

  while (this.spawnNext() && maxAttempts > 0) {
    --maxAttempts
  }
}

spawn.register()

module.exports = spawn
