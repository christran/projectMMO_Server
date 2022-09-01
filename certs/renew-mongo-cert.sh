#!/bin/bash

# Define variables
DOMAIN=npm-6

# combine latest letsencrypt files for mongo

# find latest fullchain*.pem
newestFull=$(ls -v ~/nginx-pm/letsencrypt/archive/"$DOMAIN"/fullchain*.pem | tail -n 1)
echo "$newestFull"

# find latest privkey*.pem
newestPriv=$(ls -v ~/nginx-pm/letsencrypt/archive/"$DOMAIN"/privkey*.pem | tail -n 1)
echo "$newestPriv"

# combine to mongo.pem
cat {$newestFull,$newestPriv} | tee /etc/ssl/mongo.pem

# set rights for mongo.pem
chmod 600 /etc/ssl/mongo.pem
chown mongodb:mongodb /etc/ssl/mongo.pem

# restart mongo
systemctl restart mongod