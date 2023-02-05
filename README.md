# Screeps AI

## LICENSE
Copyright (C) 2023 by Eduard Lynx.

All rights reserved.

Unauthorized copying via any medium is strictly prohibited.

Proprietary and confidential.

## Folders
`.github` and `github_conf` - GitHub specific items, such as action definitions

`dist` - deployed to official server

`history` - historical data worth saving

## TODO
Worker creeps avoid hostile areas.

Don't send military to enemy safe mode rooms.

Strelok tries to attack unreachable sections.

Intent queue for withdraw and transfer.

Fight against squads with healers.

Step away and uncrowd.

## Intents
[Spawn](https://github.com/screeps/engine/blob/78631905d975700d02786d9b666b9f97b1f6f8f9/src/processor/intents/spawns/intents.js)
[Lab](https://github.com/screeps/engine/blob/78631905d975700d02786d9b666b9f97b1f6f8f9/src/processor/intents/labs/intents.js)
[Flag](https://github.com/screeps/engine/blob/78631905d975700d02786d9b666b9f97b1f6f8f9/src/processor/intents/flags/intents.js)
[Room](https://github.com/screeps/engine/blob/78631905d975700d02786d9b666b9f97b1f6f8f9/src/processor/intents/room/intents.js)
[Global](https://github.com/screeps/engine/tree/78631905d975700d02786d9b666b9f97b1f6f8f9/src/processor/global-intents)
[Tower](https://github.com/screeps/engine/blob/78631905d975700d02786d9b666b9f97b1f6f8f9/src/processor/intents/towers/intents.js)
[Creep](https://github.com/screeps/engine/blob/78631905d975700d02786d9b666b9f97b1f6f8f9/src/processor/intents/creeps/intents.js)
[Link](https://github.com/screeps/engine/blob/78631905d975700d02786d9b666b9f97b1f6f8f9/src/processor/intents/links/intents.js)
[Power Spawn](https://github.com/screeps/engine/blob/78631905d975700d02786d9b666b9f97b1f6f8f9/src/processor/intents/power-spawns/intents.js)
[Power Creep](https://github.com/screeps/engine/blob/78631905d975700d02786d9b666b9f97b1f6f8f9/src/processor/intents/power-creeps/intents.js)

## Ideas
Two `attackController`s per tick. See evidence:

1. [Only set value is checked](https://github.com/screeps/engine/blob/78631905d975700d02786d9b666b9f97b1f6f8f9/src/processor/intents/creeps/attackController.js#L26)

2. [Only "shadow" value is set](https://github.com/screeps/engine/blob/78631905d975700d02786d9b666b9f97b1f6f8f9/src/processor/intents/creeps/attackController.js#L48)

3. ["Shadow" value is transferred to regular on tick, _once_](https://github.com/screeps/engine/blob/78631905d975700d02786d9b666b9f97b1f6f8f9/src/processor/intents/controllers/tick.js#L20)

Lodash `Chain`.

Towers fight back based on event log.

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
