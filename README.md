# Barbershop Automation App

This project provides an automation solution for barbershops, starting with a feature that follows up with clients who haven't visited in over 6 months using Acuity Scheduling. The application is built with a Node.js and Express.js backend and a React frontend.

## Features

- **Client Follow-Up**: Automatically checks for clients who haven't visited in over 6 months and sends follow-up emails.
- **Appointment Scheduling**: Integrates with Acuity Scheduling to manage appointments.
- **Payment Validation**: Ensures that clients have completed their payments.
- **Automated Messaging**: Uses iMessage and email for client communications.
- **Scalable Architecture**: Built with scalability in mind to support future feature additions.

## Getting started

### Prerequisites

- Node.js and npm
- Acuity Scheduling account

How to run project:
1. npm install
2. Set up .env file
ACUITY_USER_ID=your_acuity_user_id
ACUITY_API_KEY=your_acuity_api_key
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password
3. npm start
4. cd frontend
5. npm install
6. npm start
7. Go to http://localhost:3000 to see the app in action.
