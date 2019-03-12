# LICENSE
Copyright (C) 2019 by Eduard Lynx.
All rights reserved.
Unauthorized copying via any medium is strictly prohibited.
Proprietary and confidential.

# Folders
dist - connected to official server

# TODO
(Multiroom)  Creep keeps room ID for spawn calculations.
(Multiroom)  Use getActiveBodyparts and btyps to limit control.
(Module WAR) "Hot" areas to avoid for worker creeps.
(Future)     Build and repair through "airgap" - requires pathfinding with range.
(Economy)    Controller upgarde counter, repair HP target.
(Economy)    Move creeps from construction sites (see log of controller.build).
(Economy)    Controller controller check downgrade timer.
(Economy)    Number of creeps per type needed by room.
(Economy)    Cache room level.
(Economy)    Fill memory only when needed.
(Economy)    Double assignment is possible when two creeps get same target in one "control" cycle.
(Economy)    Repair controller not spending much on roads on walls.

# Ideas
Withdraw from enemy structures.
Dismantle enemy structures, 50 hits vs melee Attack 30 hits.
Controller Scavenge, collect dropped resources.
structureType might be faster than instanceof.
PathFinder opt flee.
Don't use new level immediately for build and repair, let creep population grow.

Dynamic creep life:
-> old creeps undergo a check;
--> TODO if not needed anymore recycle;
--> if level is less than current recycle;
--> otherwise renew;
--> spawn started to spawn creep can wait by return true.

Temporary creeps, e.g. role Heal, spawned if there are broken creeps:
-> spawn on demand;
--> recycle by "Dynamic creep life" afterwards.
