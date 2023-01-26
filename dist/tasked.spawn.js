/*eslint curly: "error"*/
'use strict'

const Tasked = require('tasked.template')
const queue = require('routine.spawn')

const spawn = new Tasked('spawn')

/**
 * Should model be dismissed from spawn process
 **/
spawn.dismiss = function (model) {
  // sanitize of old models
  if (model._time < Game.time - CREEP_LIFE_TIME) {
    return true
  }

  // sanitize of manually deleted flags
  if (model.memory && model.memory.flag) {
    const flag = Game.flags[model.memory.flag]
    return flag === undefined
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

spawn._spawnRoomMarkCheck = function (room) {
  return room._spawnMark_ === Game.time
}

spawn._spawnRoomFilter = function (room) {
  if (this._spawnRoomMarkCheck(room)) return false

  if (room.my()) {
    return room.memory.elvl > 0
  }

  return false
}

spawn._spawnRoomMark = function (room) {
  room._spawnMark_ = Game.time
}

spawn._findAllSpawnRooms = function () {
  const sourceRooms = []
  for (const roomName in Game.rooms) {
    const room = Game.rooms[roomName]
    if (this._spawnRoomFilter(room)) {
      sourceRooms.push(room)
    }
  }

  return sourceRooms
}

spawn.findStrongestSpawnRooms = function () {
  const sourceRooms = this._findAllSpawnRooms()
  sourceRooms.sort(
    function (room1, room2) {
      return room2.memory.elvl - room1.memory.elvl
    }
  )

  return sourceRooms
}

spawn.findSpawnRoomsFor = function (model) {
  // STRATEGY lowkey creeps are spawned in their own room, unless room cannot spawn them
  // n.b. spawn them at all, not "right now" because spawn points are busy, etc
  if (model.priority === 'lowkey') {
    // find room in general
    const room = Game.rooms[model.from]
    if (room && room.my()) {
      // test spawn-ability
      if (room.memory.elvl > 0) {
        if (this._spawnRoomMarkCheck(room)) {
          // room was already used this tick
          return []
        } else {
          return [room]
        }
      }
    }
  }

  const sourceRooms = this._findAllSpawnRooms()
  sourceRooms.sort(
    function (room1, room2) {
      const d1 = Game.map.getRoomLinearDistance(room1.name, model.from)
      const d2 = Game.map.getRoomLinearDistance(room2.name, model.from)

      return d1 - d2
    }
  )

  return sourceRooms
}

spawn._spawnFilter = function (structure) {
  if (structure.structureType === STRUCTURE_SPAWN) {
    return !structure.spawning && structure.isActiveSimple()
  }

  return false
}

spawn.makeBody = function (spawn, model) {
  if (_.isArray(model.body)) {
    return model.body
  }

  if (_.isString(model.body)) {
    const bodyFunction = queue.getBodyFunction(model.body)
    if (bodyFunction === undefined) return undefined

    return bodyFunction(spawn)
  }

  return undefined
}

spawn.spawnNextErrorHandler = function (spawn, model, index, rc = undefined) {
  let message =
        'spawn.spawnNext error condition ' + index +
        ' detected for ' + JSON.stringify(model) +
        ' at ' + spawn.room.name + ' [' + spawn.id + ']'

  if (rc) {
    message += ' with rc ' + rc
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

  let sourceRooms
  if (nextModel.from === queue.FROM_ANY_ROOM) {
    sourceRooms = this.findStrongestSpawnRooms()
  } else {
    sourceRooms = this.findSpawnRoomsFor(nextModel)
  }

  if (sourceRooms.length === 0) return false

  for (let i = 0; i < sourceRooms.length; ++i) {
    const sourceRoom = sourceRooms[i]

    const spawns = sourceRoom.find(
      FIND_STRUCTURES,
      {
        filter: this._spawnFilter
      }
    )

    if (spawns.length === 0) {
      this._spawnRoomMark(sourceRoom)
      continue
    }

    // because if one spawn cannot spawn, others cannot too
    // eslint-disable-next-line no-unreachable-loop
    for (let j = 0; j < spawns.length; ++j) {
      const spawn = spawns[j]

      const body = this.makeBody(spawn, nextModel)
      if (body === undefined) {
        return this.spawnNextErrorHandler(spawn, nextModel, 1)
      }

      if (body.length === 0) {
        break // from spawns cycle, room is not powerful enough
      }

      const dryRun = spawn.spawnCreep(
        body,
        nextModel.name,
        {
          dryRun: true
        }
      )

      if (dryRun === ERR_NOT_ENOUGH_ENERGY) {
        break // from spawns cycle, room will not have more energy
      }

      if (dryRun !== OK) {
        return this.spawnNextErrorHandler(spawn, nextModel, 2, dryRun)
      }

      const actualRun = spawn.spawnCreep(
        body,
        nextModel.name,
        {
          memory: nextModel.memory,
          directions: [TOP, TOP_RIGHT, RIGHT, BOTTOM_RIGHT, BOTTOM, BOTTOM_LEFT, LEFT, TOP_LEFT]
        }
      )

      if (actualRun !== OK) {
        return this.spawnNextErrorHandler(spawn, nextModel, 3, actualRun)
      }

      // remove the model
      queue.get()

      // TODO handle multiple spawns faster
      // STRATEGY don't spawn more creeps in same room to prevent energy owerdraft
      this._spawnRoomMark(sourceRoom)

      return true
    } // end of spawn loop
  } // end of loop for rooms

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
