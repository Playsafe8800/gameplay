#!/bin/bash
cd /opt/services/rummy-multi-table-node/

netstat -lntp | grep 3000
if [ $? -eq 1 ]
then
echo "service is down"
else
echo "service is up"
fi

