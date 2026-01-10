#!/bin/bash
#shopt -s extglob #added for rm -rf !(build) - https://askubuntu.com/questions/656425/syntax-error-near-unexpected-token
cd /opt/services/rummy-multi-table-node/
sudo rm -rf  /opt/services/rummy-multi-table-node/*
cp -r /opt/codedeploy-agent/deployment-root/${DEPLOYMENT_GROUP_ID}/${DEPLOYMENT_ID}/deployment-archive/. ./
cp id_rsa /home/ec2-user/.ssh/
chmod 600 /home/ec2-user/.ssh/id_rsa
npm install
npm run build
