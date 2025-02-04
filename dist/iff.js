'use strict'

const UsernameInvader = 'Invader'
const UsernamePowerBank = 'Power Bank'
const UsernamePublic = 'Public'
const UsernameScreeps = SYSTEM_USERNAME
const UsernameSourceKeeper = 'Source Keeper'

const BotSignatureOvermind = '«ᴏᴠᴇʀᴍɪɴᴅ»'

const NPCs = new Set(
  [
    UsernameInvader,
    UsernamePowerBank,
    UsernamePublic,
    UsernameScreeps,
    UsernameSourceKeeper
  ]
)

const MaxReputation = 100
const LowestAllyReputation = 25
const DefaultReputation = 0
const MinReputation = -1

const usernameSafetyPrefix = 'user_'

let ownUsername

const __safe = function (username) {
  return usernameSafetyPrefix + username
}

const _prepareHostileNPCMemory = function () {
  // if defined, pull in full definition, otherwise empty
  Game.__iff_npcReputation = Memory.npcReputation || { }

  // release memory, only remember as needed
  Memory.npcReputation = undefined
}

const _getFromObjectHash = function (objectHash) {
  // because only first key is needed
  // eslint-disable-next-line no-unreachable-loop
  for (const key in objectHash) {
    return objectHash[key]
  }

  return undefined
}

const getSomethingOwned = function () {
  return _getFromObjectHash(Game.structures) ||
         _getFromObjectHash(Game.creeps) ||
         _getFromObjectHash(Game.powerCreeps) ||
         _getFromObjectHash(Game.constructionSites)
}

const _fillOwnUsername = function () {
  if (ownUsername === undefined) {
    const somethingOwned = getSomethingOwned()
    ownUsername = somethingOwned ? somethingOwned.owner.username : undefined
  }
}

const _extendedOwnerUsername = function (something) {
  if (something.owner) return something.owner.username
  if (something.reservation) return something.reservation.username

  return undefined
}

const isUnowned = function (something) {
  return _extendedOwnerUsername(something) === undefined
}

const getNPCFactionReputation = function (username) {
  if (username === UsernameInvader) return MinReputation
  if (username === UsernamePowerBank) return DefaultReputation
  if (username === UsernamePublic) return DefaultReputation
  if (username === UsernameScreeps) return DefaultReputation
  if (username === UsernameSourceKeeper) return DefaultReputation

  return DefaultReputation
}

const getPCReputation = function (username) {
  if (Memory.reputation === undefined) {
    return DefaultReputation
  }

  const safeUsername = __safe(username)
  return Memory.reputation[safeUsername] || DefaultReputation
}

const setPCReputation = function (username, value) {
  if (Memory.reputation === undefined) {
    Memory.reputation = { }
  }

  let toSet = value
  if (toSet > MaxReputation) {
    toSet = MaxReputation
  } else if (toSet < MinReputation) {
    toSet = MinReputation
  }

  const safeUsername = __safe(username)
  // save memory on strangers
  Memory.reputation[safeUsername] = (toSet === DefaultReputation) ? undefined : toSet

  console.log('Reputation for [' + username + '] set to ' + toSet)

  return toSet
}

const adjustPCReputation = function (username, amount) {
  const now = getPCReputation(username)

  // no automatic change to "enemy" status
  if (now < DefaultReputation) {
    console.log('No change to enemy status for [' + username + ']')
    return now
  }

  let toSet = now + amount

  // no automatic change to "ally" status
  if (now < LowestAllyReputation && toSet >= LowestAllyReputation) {
    console.log('No change to neutral status for [' + username + ']')
    toSet = LowestAllyReputation - 1
  }

  return setPCReputation(username, toSet)
}

const _isNPC = function (username) {
  return NPCs.has(username)
}

const _isPC = function (username) {
  return !NPCs.has(username)
}

const isPC = function (something) {
  // you are PC
  if (something.my) return true

  const username = _extendedOwnerUsername(something)
  if (username === undefined) return false
  _fillOwnUsername()
  if (username === ownUsername) return true

  return _isPC(username)
}

const __assignPCReputation = function (something, username) {
  something.__iff_reputation_value = getPCReputation(username)
}

const __assignNPCReputation = function (something, username) {
  const factionReputation = getNPCFactionReputation(username)
  // current, then memorized, then default
  const somethingReputation = something.__iff_reputation_value || Game.__iff_npcReputation[something.id] || factionReputation

  // remember difference to next turn
  if (somethingReputation !== factionReputation) {
    if (Memory.npcReputation === undefined) {
      Memory.npcReputation = { }
    }

    Memory.npcReputation[something.id] = somethingReputation
  }

  something.__iff_reputation_value = somethingReputation
}

const _assignReputation = function (something, username) {
  if (_isPC(username)) {
    __assignPCReputation(something, username)
  } else {
    __assignNPCReputation(something, username)
  }
}

const isAlly = function (something) {
  // you are not your ally
  if (something.my) return false

  const username = _extendedOwnerUsername(something)
  if (username === undefined) return false
  _fillOwnUsername()
  if (username === ownUsername) return false

  _assignReputation(something, username)

  return something.__iff_reputation_value >= LowestAllyReputation
}

const isNeutral = function (something) {
  // you are not your neutral
  if (something.my) return false

  const username = _extendedOwnerUsername(something)
  if (username === undefined) return false
  _fillOwnUsername()
  if (username === ownUsername) return false

  _assignReputation(something, username)

  return something.__iff_reputation_value >= DefaultReputation &&
         something.__iff_reputation_value < LowestAllyReputation
}

const isHostile = function (something) {
  // your are not your hostile
  if (something.my) return false

  const username = _extendedOwnerUsername(something)
  if (username === undefined) return false
  _fillOwnUsername()
  if (username === ownUsername) return false

  _assignReputation(something, username)

  return something.__iff_reputation_value < DefaultReputation
}

Object.defineProperty(
  Structure.prototype,
  'my',
  {
    value: false,
    writable: false,
    enumerable: true
  }
)

Object.defineProperty(
  Structure.prototype,
  'ally',
  {
    value: false,
    writable: false,
    enumerable: true
  }
)

Object.defineProperty(
  Structure.prototype,
  'neutral',
  {
    value: false,
    writable: false,
    enumerable: true
  }
)

Object.defineProperty(
  Structure.prototype,
  'hostile',
  {
    value: false,
    writable: false,
    enumerable: true
  }
)

Object.defineProperty(
  Structure.prototype,
  'unowned',
  {
    value: true,
    writable: false,
    enumerable: true
  }
)

Object.defineProperty(
  Structure.prototype,
  'pc',
  {
    value: false,
    writable: false,
    enumerable: true
  }
)

Object.defineProperty(
  OwnedStructure.prototype,
  'ally',
  {
    get () {
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
    get () {
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
    get () {
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
    get () {
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
    get () {
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
    get () {
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
    get () {
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
    get () {
      return isHostile(this)
    },
    configurable: true,
    enumerable: true
  }
)

// for uniformity of interface
// creeps cannot be unowned
Object.defineProperty(
  Creep.prototype,
  'unowned',
  {
    value: false,
    writable: false,
    enumerable: true
  }
)

Object.defineProperty(
  Creep.prototype,
  'pc',
  {
    get () {
      return isPC(this)
    },
    configurable: true,
    enumerable: true
  }
)

Object.defineProperty(
  Room.prototype,
  'my',
  {
    get () {
      return this.controller ? this.controller.my : false
    },
    configurable: true,
    enumerable: true
  }
)

Object.defineProperty(
  Room.prototype,
  'ally',
  {
    get () {
      return this.controller ? isAlly(this.controller) : false
    },
    configurable: true,
    enumerable: true
  }
)

Object.defineProperty(
  Room.prototype,
  'neutral',
  {
    get () {
      return this.controller ? isNeutral(this.controller) : false
    },
    configurable: true,
    enumerable: true
  }
)

Object.defineProperty(
  Room.prototype,
  'hostile',
  {
    get () {
      return this.controller ? isHostile(this.controller) : false
    },
    configurable: true,
    enumerable: true
  }
)

Object.defineProperty(
  Room.prototype,
  'unowned',
  {
    get () {
      return this.controller ? isUnowned(this.controller) : true
    },
    configurable: true,
    enumerable: true
  }
)

Object.defineProperty(
  Room.prototype,
  'pc',
  {
    get () {
      return this.controller ? isPC(this.controller) : false
    },
    configurable: true,
    enumerable: true
  }
)

module.exports = {
  convenience () {
    _prepareHostileNPCMemory()

    _fillOwnUsername()

    Game.iff = {
      ownUsername,

      BotSignatureOvermind,

      makeAlly (username) {
        return setPCReputation(username, MaxReputation)
      },

      makeNeutral (username) {
        return setPCReputation(username, DefaultReputation)
      },

      makeHostile (username) {
        return setPCReputation(username, MinReputation)
      },

      increaseReputation (username, amount) {
        return adjustPCReputation(username, amount)
      },

      decreaseReputation (username, amount) {
        return adjustPCReputation(username, -1 * amount)
      },

      markNPCHostile (something) {
        something.__iff_reputation_value = MinReputation
        return something.__iff_reputation_value
      },

      extendedOwnerUsername (something) {
        if (something === undefined) return undefined
        return _extendedOwnerUsername(something)
      },

      isAlly (username) {
        const reputation = getPCReputation(username)
        return reputation >= LowestAllyReputation
      },

      isHostile (username) {
        const reputation = getPCReputation(username)
        return reputation < DefaultReputation
      },

      isNPC (username) {
        return _isNPC(username)
      },

      associtate (activeUsername, targetUsername, amount) {
        _fillOwnUsername()

        // in case self was leaked
        if (activeUsername === ownUsername) return MaxReputation

        const activeReputation = getPCReputation(activeUsername)
        const targetReputation = targetUsername === ownUsername ? MaxReputation : getPCReputation(targetUsername)

        if (activeReputation === targetReputation) return activeReputation

        if (activeReputation > targetReputation) {
          // better reputation is decreased by amount
          return adjustPCReputation(activeUsername, -1 * amount)
        } else {
          // worse reputation is increaed by amount
          return adjustPCReputation(activeUsername, amount)
        }
      }
    }
  }
}
