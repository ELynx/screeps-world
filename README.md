# Screeps AI

## LICENSE
Copyright (C) 2023 by Eduard Surovin.

All rights reserved.

Unauthorized copying via any medium is strictly prohibited.

Proprietary and confidential.

## Folders
`.github` and `github_conf` - GitHub specific items, such as action definitions

`dist` - deployed to official server

`history` - historical data worth saving

## TODO
Preserve registered IDs order.

Fight against squads with healers.

Step away and uncrowd.

Intent queue for withdraw and transfer.

Remove construction sites placed by previous owner of the room.

Don't send military to enemy safe mode rooms.

Outlast migrate to flag.

Strelok tries to attack unreachable sections.

Worker creeps avoid hostile areas.

## Intents
[Creep](https://github.com/screeps/engine/blob/78631905d975700d02786d9b666b9f97b1f6f8f9/src/processor/intents/creeps/intents.js)

[Flag](https://github.com/screeps/engine/blob/78631905d975700d02786d9b666b9f97b1f6f8f9/src/processor/intents/flags/intents.js)

[Global](https://github.com/screeps/engine/tree/78631905d975700d02786d9b666b9f97b1f6f8f9/src/processor/global-intents)

[Lab](https://github.com/screeps/engine/blob/78631905d975700d02786d9b666b9f97b1f6f8f9/src/processor/intents/labs/intents.js)

[Link](https://github.com/screeps/engine/blob/78631905d975700d02786d9b666b9f97b1f6f8f9/src/processor/intents/links/intents.js)

[Power Creep](https://github.com/screeps/engine/blob/78631905d975700d02786d9b666b9f97b1f6f8f9/src/processor/intents/power-creeps/intents.js)

[Power Spawn](https://github.com/screeps/engine/blob/78631905d975700d02786d9b666b9f97b1f6f8f9/src/processor/intents/power-spawns/intents.js)

[Room](https://github.com/screeps/engine/blob/78631905d975700d02786d9b666b9f97b1f6f8f9/src/processor/intents/room/intents.js)

[Spawn](https://github.com/screeps/engine/blob/78631905d975700d02786d9b666b9f97b1f6f8f9/src/processor/intents/spawns/intents.js)

[Tower](https://github.com/screeps/engine/blob/78631905d975700d02786d9b666b9f97b1f6f8f9/src/processor/intents/towers/intents.js)

## Ideas
Lodash `Chain`.

Some material on autobases:

* [Wiki overview](https://wiki.screepspl.us/index.php/Automatic_base_building)

* [International Bot](https://github.com/The-International-Screeps-Bot/The-International-Open-Source/blob/7fb3ccb5ecae4ab7f5eb5dcf9bbd13c022ba30c2/src/international/constants.ts#L399)

* [Kasami Bot](https://github.com/kasami/kasamibot)

TIP OF THE DAY: Use Room.energyAvailable and Room.energyCapacityAvailable to determine how much energy all the spawns and extensions in the room contain.

TIP OF THE DAY: You can output HTML content to the console, like links to rooms. `<a href="url">link text</a>` -> `https://screeps.com/a/url`

Fatigue based emergent road building. CostMatrix has ser-de.

Limit autobuild run to some N elements.

`upgradeController` is not in 1st pipeline, can be called in parallel with repair or build.

Incorporate [Cartographer](https://github.com/glitchassassin/screeps-cartographer)

Send resources away instead of selling out on panic.

Room attack definition: drop aggro, drop streloks, claim and plunders.

Tasked default movement options. Claim has swamp cheap. Auto.

Flag to turn verbose naming on and off.

Border control for creep movement in tasked. Tie-in with default options?

If room hostile is PC set threat level higher.

If room has no towers set threat level higher.

`Game.spawns`.
