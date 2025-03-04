#!/bin/bash

# Exit on any error
set -e

LOG_GROUP_NAME="/ecs/chat-api"
CLUSTER_NAME="chat-cluster"

echo "📋 Fetching logs from $LOG_GROUP_NAME..."

# Get the most recent log stream
LOG_STREAM=$(aws logs describe-log-streams \
  --log-group-name $LOG_GROUP_NAME \
  --order-by LastEventTime \
  --descending \
  --limit 1 \
  --query 'logStreams[0].logStreamName' \
  --output text)

if [ -z "$LOG_STREAM" ]; then
  echo "❌ No log streams found"
  exit 1
fi

echo "📊 Showing logs from stream: $LOG_STREAM"

# Get and display the logs
aws logs get-log-events \
  --log-group-name $LOG_GROUP_NAME \
  --log-stream-name $LOG_STREAM \
  --limit 100 \
  --query 'events[*].[timestamp,message]' \
  --output table

# Optional: follow logs in real-time
# aws logs tail $LOG_GROUP_NAME --follow 