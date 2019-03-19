# LICENSE
Copyright (C) 2019 by Eduard Lynx.
All rights reserved.
Unauthorized copying via any medium is strictly prohibited.
Proprietary and confidential.

# Folders
dist - connected to official server

# TODO
(Multiroom)  Use getActiveBodyparts and btyps to limit control.
(Module WAR) "Hot" areas to avoid for worker creeps.
(Future)     Build and repair through "airgap" - requires pathfinding with range.
(Economy)    Move creeps from construction sites (see log of controller.build).
(Economy)    Number of creeps per type needed by room.

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
--> give energy to spawn while nearby.

Temporary creeps, e.g. role Heal, spawned if there are broken creeps:
-> spawn on demand;
--> recycle by "Dynamic creep life" afterwards.

# Profiler
Uses github.com/samogot/screeps-profiler, more up-to-date and feature branch
Uses commit a128654877d2bd07bd405eb4e41a0ecd5aed5d42 to master
