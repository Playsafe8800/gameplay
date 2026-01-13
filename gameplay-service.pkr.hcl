packer {
  required_plugins {
    amazon = {
      version = ">= 1.2.8"
      source  = "github.com/hashicorp/amazon"
    }
  }
}

variable "short_sha" {
  type    = string
  default = ""
}

source "amazon-ebs" "gameplay-service" {
  ami_name        = "gameplay-service-${var.short_sha}"
  instance_type   = "t3.small"
  region          = "ap-south-1"
  source_ami      = "ami-0bf78b6cc4813d837"
  ssh_username    = "admin"
  associate_public_ip_address = false
  subnet_id                   = "subnet-0bfd32d5ef0a34f5c"
  vpc_id                      = "vpc-090f3076eef114845"
  security_group_ids          = ["sg-08da3c1d42ab9152a"]
  iam_instance_profile = "github-runner-iam-role"

  tags = {
    Name        = "GameplayService-Packer-${var.short_sha}"
    ServiceName = "gameplay-service"
  }
}

build {
  sources = ["source.amazon-ebs.gameplay-service"]

  # Install system dependencies
  provisioner "shell" {
    inline = [
      "sudo apt update -y",
      "sudo apt install git -y",
      "sudo curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -",
      "sudo apt-get install -y nodejs",
      "sudo apt-get install -y htop",
      "sudo npm install -g pm2",
      "sudo apt install python3-venv -y"
    ]
  }

  # Set up the user service directory
  provisioner "shell" {
    inline = [
      "sudo mkdir -p /opt/trust/gameplay-service",
      "sudo chown admin:admin /opt/trust/gameplay-service",
      "git clone https://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@github.com/trustGaming/rummy-node.git /opt/entwik/gameplay-service",
      "cd /opt/trust/gameplay-service",
      "npm i --legacy-peer-deps",
      "npm run build"
    ]
  }

  provisioner "shell" {
    inline = [
      "sudo mkdir -p /opt/trust/rummy-tutor",
      "sudo chown admin:admin /opt/trust/rummy-tutor",
      "git clone https://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@github.com/trustGaming/rummy-tutor.git /opt/entwik/rummy-tutor",
      "cd /opt/trust/rummy-tutor",
      "python3 -m venv venv"
    ]
  }

  # Fetch secrets and set up environment
  provisioner "shell" {
    inline = [
      "aws s3 cp s3://trust-be/gameplay-service.sh gameplay-service.sh && sudo mv gameplay-service.sh /etc/profile.d/gameplay-service.sh",
      "sudo chmod +x /etc/profile.d/gameplay-service.sh",
      "sudo chown admin:admin /etc/profile.d/gameplay-service.sh",
      "echo 'export DEPLOYMENT_HASH=${var.short_sha}' | sudo tee -a /etc/profile.d/gameplay-service.sh",
      "echo 'export NEW_RELIC_LABELS=\"version:${var.short_sha}\"' | sudo tee -a /etc/profile.d/gameplay-service.sh",
      "echo 'export NEW_RELIC_APP_VERSION=\"app_version:${var.short_sha}\"' | sudo tee -a /etc/profile.d/gameplay-service.sh",
      "echo 'export NEW_RELIC_DEPLOYMENT_HASH=\"${var.short_sha}\"' | sudo tee -a /etc/profile.d/gameplay-service.sh",
      "ls -l /etc/profile.d/gameplay-service.sh",
      "sh /etc/profile.d/gameplay-service.sh"
    ]
  }

  # Install New Relic and start the service
  provisioner "shell" {
    inline = [
      "sudo apt-get install -y wget",
      "wget https://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/debian_amd64/amazon-ssm-agent.deb",
      "sudo dpkg -i amazon-ssm-agent.deb",
      "sudo systemctl enable amazon-ssm-agent",
      "sudo systemctl start amazon-ssm-agent",
      "sudo systemctl status amazon-ssm-agent"
    ]
  }
}
