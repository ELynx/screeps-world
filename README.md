# LICENSE
Copyright (C) 2019 by Eduard Surovin.
All rights reserved.
Unauthorized copying of via any medium is strictly prohibited.
Proprietary and confidential.

# Folders
dist - connected to official server

# Economics
## Room level
✖️ Spawn
✖️ Harvest
✖️ Restock
✖️ Build
✖️ Repair
✖️ Controller upgrade

# Warfare
## Room level
✔️ Psychological warfare

# TODO
Cached "creep with energy" search in controller.template.
"Hot" areas to avoid for worker creeps.
Creep keeps room ID for spawn calculations.
No dependency on hasRestockers
Build and repair through "airgap"

# Ideas
Withdraw from enemy structures
Dismantle enemy structures, 50 hits vs melee Attack 30 hits
Use getActiveBodyparts
Use Room.lookAtArea
Role Scavenge, collect dropped resources (any?)

Dynamic creep life
-> old creeps undergo a check
--> if not needed anymore recycle
--> if level is less than current recycle
--> otherwise renew

Temporary creeps, roles Repair and Heal, spawned if there are broken structures and creeps correspondingly.
-> Spawn on demand
--> recycle by "Dynamic creep life" afterwards

Periodically drop off controllers, e.g. prevent endless controller upgrade
Even distribution of restockers per restockables

PathFinder opt flee

Don't use new level immediately for build and repair, let creep population grow
