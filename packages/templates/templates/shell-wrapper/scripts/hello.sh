#!/usr/bin/env {{shellType}}
# Description: Greet someone with a personalized message

if [ $# -eq 0 ]; then
    echo "Hello from {{serverName}}!"
else
    echo "Hello, $1! This is {{serverName}} speaking."
fi