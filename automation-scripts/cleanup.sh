#!/bin/bash
#rm /home/ec2-user/.ssh/id_rsa
REGION=$(wget -q -O - http://169.254.169.254/latest/meta-data/placement/availability-zone | sed -e "s/.$//")
ID=$(wget -q -O - http://169.254.169.254/latest/meta-data/instance-id)
aws ec2 create-tags --resources $ID  --region $REGION  --tags Key=latest-deployed,Value=$VERSION