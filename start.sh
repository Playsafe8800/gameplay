#!/bin/bash
curl -fsSL https://download.newrelic.com/install/newrelic-cli/scripts/install.sh | bash
source  /etc/profile.d/gameplay-service.sh
sudo NEW_RELIC_API_KEY=${NEW_RELIC_API_KEY} NEW_RELIC_ACCOUNT_ID=${NEW_RELIC_ACCOUNT_ID} newrelic install -y
cd /opt/trust/gameplay-service/
ulimit -n 65535 && pm2 start ecosystem.config.js
cd /opt/trust/rummy-tutor/
source venv/bin/activate
pip install flask
pip install requests
pip install pandas
pm2 start api.py
pm2 save
sudo systemctl restart amazon-ssm-agent
