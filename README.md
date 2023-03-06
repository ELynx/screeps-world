# Screeps AI

## LICENSE
Copyright (C) 2023 by Eduard Surovin.

All rights reserved.

Unauthorized copying via any medium is strictly prohibited.

Proprietary and confidential.

## Folders
`.github` and `github_conf` - GitHub specific items, such as action definitions

`dist` - deployment payload

`history` - historical data worth saving

## TODO
Monitor invader power goal and prepare for them.

Block positions that are targeted by room creeps:

* Check reach-ability before going to target.

* Check reach-ability before assigning target.

Spawn blocked in one room starves other rooms.

Movement and positioning:

* Step away and uncrowd.

* Strelok tries to attack unreachable sections.

* Worker creeps avoid hostile areas.

Don't send military to enemy safe mode rooms.

Cluster restock.

Beetle with ATTACK instead of WORK:

* Melee around as Strelok.

* Check pipeline for `attack` and `dismantle`.

* Melee creeps in front.

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
Some material on autobases:

* [Wiki overview](https://wiki.screepspl.us/index.php/Automatic_base_building)

* [International Bot](https://github.com/The-International-Screeps-Bot/The-International-Open-Source/blob/7fb3ccb5ecae4ab7f5eb5dcf9bbd13c022ba30c2/src/international/constants.ts#L399)

* [Kasami Bot](https://github.com/kasami/kasamibot)

* [Screeps Script](https://github.com/slothsoft/screeps-script)

TIP OF THE DAY: You can output HTML content to the console, like links to rooms. `<a href="url">link text</a>` -> `https://screeps.com/a/url`

Fatigue based emergent road building. CostMatrix has ser-de.

[SnappyJS](https://github.com/zhipeng-jia/snappyjs) compression library with support for unsigned 8 byte array support.

Take snapshot of buildings, use to re-build the room.

Limit autobuild run to some N elements.

Send resources away instead of selling out on panic.

Sell off commodities.

Room attack definition:

* Breached only Streloks on towers and spawns.

* Outlasts.

* Plunders on major structures.

* Claim on controller.

* n.b. Claim will not open attack if aggro is set. Look out for this if safe mode prevention is needed.

Flag to turn verbose naming on and off.

Intent queue for withdraw and transfer.

Account for tower spending energy, renew, etc. Basically, more intent wrappers.

Monitor Source Keeper respawn.

Spawn intent uber-wrapper:

* Delayed call to spawn

* Store all intended parameters for examination and modification.

* Cancel without energy loss.

Tasked subspecies.

Instead of healing by towers spawn healers.
