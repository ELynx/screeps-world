# Screeps AI

## LICENSE

Copyright (C) 2024 by Eduard Surovin.

All rights reserved.

Unauthorized copying via any medium is strictly prohibited.

Proprietary and confidential.

## Folders

`.github` - GitHub Action definitions

`dist` - deployment payload

`history` - historical data worth saving

## TODO

In emergency, release stored energy.

Spawn blocked in one room starves other rooms.

Movement and positioning:

* Step away.

* Strelok tries to attack unreachable sections.

* Plunder tries to plunder unreachable sections.

* -> Because moveTo does not check for reached range.

* Worker creeps avoid hostile areas.

React to PowerCreeps.

## Intents

[Intents](https://github.com/screeps/engine/tree/master/src/processor/intents)

## Ideas

### Auto base building

Some material on autobases:

* [Wiki overview](https://wiki.screepspl.us/index.php/Automatic_base_building)

* [International Bot](https://github.com/The-International-Screeps-Bot/The-International-Open-Source)

* [Kasami Bot](https://github.com/kasami/kasamibot)

* [Screeps Script](https://github.com/slothsoft/screeps-script)

Fatigue based emergent road building.

Source link placement adjacent (and maybe vectored) from source container.

Auto create security_ flags based on autobuild.

Roads on constructed walls cost as much as roads on plains. Can be used for securing entrance with failsafe paths.

### Economy

Cluster restock.

Global Control farm rooms.

Unlive old miners.

### Auto room attack / defense

Room attack definition:

* War flag

* Breached only Streloks on towers and spawns.

* Outlasts.

* Plunders on major structures.

* Claim on controller.

* n.b. Claim will not open attack if aggro is set. Look out for this if safe mode prevention is needed.

Flag to turn verbose naming on and off.

* Auto condition to turn verbose naming on and off.

* -> War?

Instead of healing by towers spawn healers.

Don't send military to enemy safe mode rooms.

### Technical

? Intent queue for withdraw and transfer.

? Spawn intent uber-wrapper:

* Delayed call to spawn

* Store all intended parameters for examination and modification.

* Cancel without energy loss.

[Creep body part colors](https://github.com/screeps/renderer/blob/a94760f146afd2a299bd13342b83c596d3f10252/engine/src/lib/processors/creepBuildBody.js#L13)

Power Creeps can be [renewed](https://docs.screeps.com/api/#PowerCreep.renew) at Power Banks. Far travel!
