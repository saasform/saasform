# Airtable on Express on Saasform

This project allows you to add authentication and payments to Airtable forms in minutes.

The project is ready to be run:

1. Run Saasform: `docker-compose up saasform`
1. Get the Airtable share code (you can share forms, kanban, everything). Let's say it is `shr1234567890xxxx`
1. Run this project: AIRTABLE_SHARE_CODE='shr1234567890xxxx' yarn start

That's it. Open http://localhost:3000 to see it in action (you will be redirected to http://localhost:7000 to sign up or sign in)
