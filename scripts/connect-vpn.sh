#!/bin/bash
aws ec2 start-client-vpn-endpoint-associations --client-vpn-endpoint-id <your-endpoint-id>
aws ec2 import-client-vpn-client-certificate \
  --client-vpn-endpoint-id <your-endpoint-id> \
  --certificate-file certs/client1.domain.tld.crt \
  --private-key-file certs/client1.domain.tld.key

# Open AWS VPN Client with configuration
aws ec2 export-client-vpn-client-configuration \
  --client-vpn-endpoint-id <your-endpoint-id> \
  --output text > certs/client-vpn-config.ovpn 