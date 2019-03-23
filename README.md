# LICENSE
Copyright (C) 2019 by Eduard Lynx.
All rights reserved.
Unauthorized copying via any medium is strictly prohibited.
Proprietary and confidential.

# Folders
dist - connected to official server

# TODO
(Module WAR) "Hot" areas to avoid for worker creeps.
(Economy)    Number of creeps per type needed by room.
(Economy)    Number of creeps depend on source number.

# Ideas
Intent pipeline! Do more things in one turn!
Withdraw from enemy structures.
Dismantle enemy structures, 50 hits vs melee Attack 30 hits.
structureType might be faster than instanceof.
PathFinder opt flee.
moveTo has same options as PathFinder.
StructureContainer is not owned.

Dynamic creep life:
-> old creeps undergo a check;
--> TODO if not needed anymore recycle;
--> if level is less than current recycle;
--> otherwise renew;
--> spawn started to spawn creep can wait by return true.
--> give energy to spawn while nearby.

Temporary creeps:
-> spawn on demand;
--> recycle by "Dynamic creep life" afterwards.

Roads in neutral room require change in repair code to work on energy level 0.

# Profiler
Uses github.com/samogot/screeps-profiler, more up-to-date and feature branch
Uses commit a128654877d2bd07bd405eb4e41a0ecd5aed5d42 to master
