# LICENSE
Copyright (C) 2019 by Eduard Lynx.
All rights reserved.
Unauthorized copying of via any medium is strictly prohibited.
Proprietary and confidential.

# Folders
dist - connected to official server

# TODO
Cached "creep with energy" search in controller.template.
"Hot" areas to avoid for worker creeps.
Creep keeps room ID for spawn calculations.
!Level based on current capacity, not controller level. Or creeps die out because there are no extensions.
!Automatic controller mapping

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
