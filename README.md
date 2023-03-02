# Screeps AI

## LICENSE
Copyright (C) 2023 by Eduard Lynx.

All rights reserved.

Unauthorized copying via any medium is strictly prohibited.

Proprietary and confidential.

## Folders
`.github` and `github_conf` - GitHub specific items, such as action definitions

`dist` - deployment payload

`history` - historical data worth saving

## TODO
Room level 0 support in `process.spawn`. Room level 0 cannot spawn, treat differently.

Spawn caches do not take `spawning` into account.

Movement and positioning:

* Step away and uncrowd.

* Strelok tries to attack unreachable sections.

* Outlast migrate to flag.

* Worker creeps avoid hostile areas.

Don't send military to enemy safe mode rooms.

Cluster restock.

Beetle with ATTACK instead of WORK.

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

* [Screeps Script](https://github.com/slothsoft/screeps-script)

TIP OF THE DAY: You can output HTML content to the console, like links to rooms. `<a href="url">link text</a>` -> `https://screeps.com/a/url`

Fatigue based emergent road building. CostMatrix has ser-de.

[SnappyJS](https://github.com/zhipeng-jia/snappyjs) compression library with support for byte 8 array support.

Limit autobuild run to some N elements.

Send resources away instead of selling out on panic.

Sell off commodities.

Room attack definition: drop aggro, drop streloks, claim and plunders.

Border control for creep movement in tasked.

Flag to turn verbose naming on and off.

`upgradeController` is not in 1st pipeline, can be called in parallel with repair or build.

Intent queue for withdraw and transfer.

Account for tower spending energy, renew, etc. Basically, more intent wrappers.

Monitor invader power goal and prepare for them.

Spawn intent uber-wrapper:

* Delayed call to spawn

* Store all intended parameters for examination and modification.

* Replace renew with recycle when spawn is called.

* Cancel without energy loss.
