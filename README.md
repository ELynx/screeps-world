# LICENSE
Copyright (C) 2023 by Eduard Surovin.

All rights reserved.

Unauthorized copying via any medium is strictly prohibited.

Proprietary and confidential.

# Folders
.github - github specific items, such as action definitions

dist - deployed to official server

history - historical data worth saving

# TODO
Worker creeps avoid hostile areas.

Don't send military to enemy safe mode rooms.

Predictive controller drop.

Autobuild energy containers.

Strelok try to attack locked sections.

# Intents
https://github.com/screeps/engine/blob/78631905d975700d02786d9b666b9f97b1f6f8f9/src/processor/intents/spawns/intents.js
https://github.com/screeps/engine/blob/78631905d975700d02786d9b666b9f97b1f6f8f9/src/processor/intents/labs/intents.js
https://github.com/screeps/engine/blob/78631905d975700d02786d9b666b9f97b1f6f8f9/src/processor/intents/flags/intents.js
https://github.com/screeps/engine/blob/78631905d975700d02786d9b666b9f97b1f6f8f9/src/processor/intents/room/intents.js
https://github.com/screeps/engine/tree/78631905d975700d02786d9b666b9f97b1f6f8f9/src/processor/global-intents
https://github.com/screeps/engine/blob/78631905d975700d02786d9b666b9f97b1f6f8f9/src/processor/intents/towers/intents.js
https://github.com/screeps/engine/blob/78631905d975700d02786d9b666b9f97b1f6f8f9/src/processor/intents/creeps/intents.js
https://github.com/screeps/engine/blob/78631905d975700d02786d9b666b9f97b1f6f8f9/src/processor/intents/links/intents.js
https://github.com/screeps/engine/blob/78631905d975700d02786d9b666b9f97b1f6f8f9/src/processor/intents/power-spawns/intents.js
https://github.com/screeps/engine/blob/78631905d975700d02786d9b666b9f97b1f6f8f9/src/processor/intents/power-creeps/intents.js

# Ideas
Two `attackController`s per tick. See evidence:

1. Only set value is checked https://github.com/screeps/engine/blob/78631905d975700d02786d9b666b9f97b1f6f8f9/src/processor/intents/creeps/attackController.js#L26

2. Only "shadow" value is set https://github.com/screeps/engine/blob/78631905d975700d02786d9b666b9f97b1f6f8f9/src/processor/intents/creeps/attackController.js#L48

3. "Shadow" value is transferred to regular on tick, _once_ https://github.com/screeps/engine/blob/78631905d975700d02786d9b666b9f97b1f6f8f9/src/processor/intents/controllers/tick.js#L20


PathFinder option `flee`.

Lodash `Chain`.

Towers fight back based on event log.

https://wiki.screepspl.us/index.php/Automatic_base_building
https://github.com/The-International-Screeps-Bot/The-International-Open-Source/blob/7fb3ccb5ecae4ab7f5eb5dcf9bbd13c022ba30c2/src/international/constants.ts#L399
https://github.com/kasami/kasamibot

Intent collision detection with prototypes.

Profiler accounts for `[A]ctions` with 0.2 CPU increase.

TIP OF THE DAY: Use Room.energyAvailable and Room.energyCapacityAvailable to determine how much energy all the spawns and extensions in the room contain.

TIP OF THE DAY: You can output HTML content to the console, like links to rooms.

TIP OF THE DAY: You can apply transfer and heal to another player’s creep, and transfer, build and repair to others’ structures.

https://github.com/screepers/screeps-snippets/blob/master/src/misc/JavaScript/OwnedStructure%20Memory.js
