#!/bin/bash

# Exit on any error
set -e

# Set AWS region if not already set
AWS_REGION=${AWS_REGION:-us-east-1}
CLUSTER_NAME="chat-cluster"
SERVICE_NAME="chat-api"

echo "🔍 Finding your application URL..."

# Get the most recent task
TASK_ARN=$(aws ecs list-tasks --cluster chat-cluster --query 'taskArns[0]' --output text)

# If task exists, describe it
if [ ! -z "$TASK_ARN" ]; then
  aws ecs describe-tasks --cluster chat-cluster --tasks $TASK_ARN
else
  echo "No running tasks found in cluster"
fi

# Get the ENI ID
echo "Getting network interface ID..."
ENI_ID=$(aws ecs describe-tasks \
  --cluster $CLUSTER_NAME \
  --tasks $TASK_ARN \
  --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' \
  --output text)

# Get the public IP
echo "Getting public IP..."
PUBLIC_IP=$(aws ec2 describe-network-interfaces \
  --network-interface-ids $ENI_ID \
  --query 'NetworkInterfaces[0].Association.PublicIp' \
  --output text)

echo "✅ Your app is running at: http://$PUBLIC_IP:6000" 