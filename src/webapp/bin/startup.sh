#!/bin/bash

echo "START"

until node node_modules/typeorm/cli.js query "SELECT 1" &> /dev/null; do
echo 'Waiting Maria ...';
sleep 5
done

echo "MARIA DB IS UP AND RUNNING"

node node_modules/typeorm/cli.js migration:run

node dist/main.js
