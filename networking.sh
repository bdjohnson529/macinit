#!/bin/zsh

# Define the interface - usually Wi-Fi
INTERFACE="Wi-Fi"

echo "Select Network Mode:"
echo "1) TRAVEL (Static IP for Hotspot)"
echo "2) HOME (Automatic DHCP)"
read choice

if [[ $choice -eq 1 ]]; then
    echo "Applying Travel Settings..."
    # Set Static IP, Subnet, and Router
    sudo networksetup -setmanual "$INTERFACE" 172.20.10.5 255.255.255.240 172.20.10.1
    # Set Global DNS (Google & Cloudflare) to bypass regional blocks
    sudo networksetup -setdnsservers "$INTERFACE" 8.8.8.8 1.1.1.1
    echo "Done. Manual IP 172.20.10.5 applied."
    
elif [[ $choice -eq 2 ]]; then
    echo "Applying Home Settings..."
    # Revert to DHCP
    sudo networksetup -setdhcp "$INTERFACE"
    # Clear DNS overrides to use local router DNS
    sudo networksetup -setdnsservers "$INTERFACE" "Empty"
    echo "Done. Switched back to Automatic DHCP."
    
else
    echo "Invalid choice. Exiting."
fi
