# Screeps AI

## LICENSE

Copyright (C) 2024 by Eduard Lynx.

All rights reserved.

Unauthorized copying via any medium is strictly prohibited.

Proprietary and confidential.

## Folders

`.github` - GitHub Action definitions

`dist` - deployment payload

`history` - historical data worth saving

## TODO

In emergency, release stored energy.

Plunders and other creeps has some place to dump resources.

Spawn blocked in one room starves other rooms.

Movement and positioning:

* Step away.

* Strelok tries to attack unreachable sections.

* Plunder tries to plunder unreachable sections.

* Because moveTo does not check for reached range.

* Worker creeps avoid hostile areas.

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

### Auto base building

Some material on autobases:

* [Wiki overview](https://wiki.screepspl.us/index.php/Automatic_base_building)

* [International Bot](https://github.com/The-International-Screeps-Bot/The-International-Open-Source/blob/7fb3ccb5ecae4ab7f5eb5dcf9bbd13c022ba30c2/src/international/constants.ts#L399)

* [Kasami Bot](https://github.com/kasami/kasamibot)

* [Screeps Script](https://github.com/slothsoft/screeps-script)

Fatigue based emergent road building.

Source link placement adjacent (and maybe vectored) from source container.

Auto create security_ flags based on autobuild.

### Economy

Clean up source and other technical containers.

Cluster restock.

Global Control farm rooms.

### Auto room attack / defense

Room attack definition:

* Breached only Streloks on towers and spawns.

* Outlasts.

* Plunders on major structures.

* Claim on controller.

* n.b. Claim will not open attack if aggro is set. Look out for this if safe mode prevention is needed.

Flag to turn verbose naming on and off.

* Auto condition to turn verbose naming on and off.

Instead of healing by towers spawn healers.

No firing at things in room safe mode.

Ignore Invader healers if no other Invader creeps exist.

Don't send military to enemy safe mode rooms.

### Technical

Intent queue for withdraw and transfer.

Spawn intent uber-wrapper:

* Delayed call to spawn

* Store all intended parameters for examination and modification.

* Cancel without energy loss.

[Creep body part colors](https://github.com/screeps/renderer/blob/a94760f146afd2a299bd13342b83c596d3f10252/engine/src/lib/processors/creepBuildBody.js#L13)

Power Creeps can be [renewed](https://docs.screeps.com/api/#PowerCreep.renew) at Power Banks. Far travel!
