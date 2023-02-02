'use strict'

const UsernameInvader = 'Invader'
const UsernamePowerBank = 'Power Bank'
const UsernamePublic = 'Public'
const UsernameScreeps = 'Screeps'
const UsernameSourceKeeper = 'Source Keeper'

const NPCs = [
  UsernameInvader,
  UsernamePowerBank,
  UsernamePublic,
  UsernameScreeps,
  UsernameSourceKeeper
]

const MaxReputation = 100
const LowestAllyReputation = 25
const DefaultReputation = 0
const MinReputation = -1

const verbose = true

const isUnowned = function (something) {
  return something.owner === undefined
}

const getNPCFactionReputation = function (something) {
  if (isUnowned(something)) return DefaultReputation

  const username = something.owner.username

  if (username === UsernameInvader) return MinReputation
  if (username === UsernamePowerBank) return DefaultReputation
  if (username === UsernamePublic) return DefaultReputation
  if (username === UsernameScreeps) return DefaultReputation
  if (username === UsernameSourceKeeper) return DefaultReputation

  if (verbose) {
    console.log('Unknown NPC faction [' + username + '9')
  }

  return DefaultReputation
}

const getPcReputation = function (username) {
  if (Memory.reputation === undefined) {
    return DefaultReputation
  }

  return Memory.reputation[username] || DefaultReputation
}

const setPcReputation = function (username, value) {
  if (Memory.reputation === undefined) {
    Memory.reputation = { }
  }

  let toSet = value
  if (toSet > MaxReputation) {
    toSet = MaxReputation
  } else if (toSet < MinReputation) {
    toSet = MinReputation
  }

  // save memory on strangers
  Memory.reputation[username] = (toSet === DefaultReputation) ? undefined : toSet

  if (verbose) {
    console.log('Reputation for [' + username + '] set to ' + toSet)
  }

  return toSet
}

const adjustPcReputation = function (username, amount) {
  const now = getPcReputation(username)

  // no automatic change to "enemy" status
  if (now < DefaultReputation) {
    if (verbose) {
      console.log('No change to enemy status for [' + username + ']')
    }

    return
  }

  let toSet = now + amount

  // no automatic change to "ally" status
  if (now < LowestAllyReputation && toSet >= LowestAllyReputation) {
    toSet = LowestAllyReputation - 1
  }

  return setPcReputation(username, toSet)
}

const isPC = function (something) {
  // you are PC
  if (something.my) return true

  if (isUnowned(something)) return false

  return !_.some(NPCs, _.matches(something.owner.username))
}

const _assignReputation = function (something) {
  if (something.__reputation) return

  if (isPC(something)) {
    something.__reputation = getPcReputation(something.owner.username)
  } else {
    something.__reputation = getNPCFactionReputation(something)
  }
}

const isAlly = function (something) {
  // you are not your ally
  if (something.my) return false

  _assignReputation(something)

  return something.__reputation >= LowestAllyReputation
}

const isNeutral = function (something) {
  // you are not your neutral
  if (something.my) return false

  _assignReputation(something)

  return something.__reputation >= DefaultReputation &&
         something.__reputation < LowestAllyReputation
}

const isHostile = function (something) {
  // your are not your hostile
  if (something.my) return false

  _assignReputation(something)

  return something.__reputation < DefaultReputation
}

Object.defineProperty(
  OwnedStructure.prototype,
  'ally',
  {
    get: function () {
      return isAlly(this)
    },
    configurable: true,
    enumerable: true
  }
)

Object.defineProperty(
  OwnedStructure.prototype,
  'neutral',
  {
    get: function () {
      return isNeutral(this)
    },
    configurable: true,
    enumerable: true
  }
)

Object.defineProperty(
  OwnedStructure.prototype,
  'hostile',
  {
    get: function () {
      return isHostile(this)
    },
    configurable: true,
    enumerable: true
  }
)

Object.defineProperty(
  OwnedStructure.prototype,
  'unowned',
  {
    get: function () {
      return isUnowned(this)
    },
    configurable: true,
    enumerable: true
  }
)

Object.defineProperty(
  OwnedStructure.prototype,
  'pc',
  {
    get: function () {
      return isPC(this)
    },
    configurable: true,
    enumerable: true
  }
)

Object.defineProperty(
  Creep.prototype,
  'ally',
  {
    get: function () {
      return isAlly(this)
    },
    configurable: true,
    enumerable: true
  }
)

Object.defineProperty(
  Creep.prototype,
  'neutral',
  {
    get: function () {
      return isNeutral(this)
    },
    configurable: true,
    enumerable: true
  }
)

Object.defineProperty(
  Creep.prototype,
  'hostile',
  {
    get: function () {
      return isHostile(this)
    },
    configurable: true,
    enumerable: true
  }
)

Object.defineProperty(
  Creep.prototype,
  'pc',
  {
    get: function () {
      return isPC(this)
    },
    configurable: true,
    enumerable: true
  }
)

module.exports = {
  convenience () {
    Game.iff = {
      makeAlly (username) {
        return setPcReputation(username, MaxReputation)
      },

      makeNeutral (username) {
        return setPcReputation(username, DefaultReputation)
      },

      makeHostile (username) {
        return setPcReputation(username, MinReputation)
      },

      increaseReputation (username, amount) {
        return adjustPcReputation(username, amount)
      },

      decreaseReputation (username, amount) {
        return adjustPcReputation(username, -1 * amount)
      }
    }
  }
}
