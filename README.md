# COCOBOD CHED Telephone Exchange Management System

## Overview

This application is a comprehensive management system for the COCOBOD CHED (Cocoa Health and Extension Division) telephone exchange. It provides a suite of tools for receptionists, administrators, and technicians to manage calls, billing, and system maintenance efficiently.

The system is designed with a modern user interface and is broken down into several key modules to handle the various operational needs of the telephone exchange.

## Key Features

### 📞 Reception & Call Management
- **Call Intake Form**: A detailed form for receptionists to log incoming calls, capture caller information, and route calls to the appropriate departments.
- **Active Call Monitoring**: A live dashboard to view all active calls, their status (connected, on-hold), duration, and priority.
- **Caller Search & History**: A powerful search utility to look up previous callers by name, phone number, or organization, and view their call history.
- **Call Details & Transfer**: View detailed information for each call and transfer calls between departments or to specific staff members.

### 💰 Billing & Payments
- **Bill Generation**: Automatically or manually generate detailed bills for different cycles (daily, weekly, monthly).
- **Bill Details**: View comprehensive details for each generated bill, including call logs, charges, and taxes.
- **Payment Recording**: A simple interface to record payments against invoices using various payment methods (Cash, Mobile Money, Bank Transfer, etc.).

### 🛠️ Maintenance & Fault Reporting
- **Fault Reporting**: An intuitive form for any user to report equipment or system faults, specifying location, priority, and equipment affected.
- **Fault Tracking**: A dashboard for technicians to view, track, and update the status of reported faults.
- **Maintenance Scheduling**: A tool for administrators to schedule preventive or corrective maintenance tasks and assign them to technicians.

## Technology Stack

- **Backend**: PHP
- **Frontend**: React, TypeScript
- **UI Framework**: shadcn/ui, Tailwind CSS
- **Database**: MySQL / MariaDB (managed via WAMP)
- **Development Environment**: WAMP Server

## Project Structure

```
/TelephoneXchange
├── components/         # React components, organized by feature
│   ├── billing/
│   ├── calls/
│   ├── layout/
│   └── ...
├── config/             # PHP configuration files (e.g., database.php)
├── database/           # SQL schema, triggers, and sample data
├── includes/           # Shared PHP files (header, footer, functions)
├── lib/                # Client-side libraries and helpers (e.g., auth.ts)
├── node_modules/       # Node.js dependencies
├── pages/              # Main PHP pages for different views (dashboard, billing, etc.)
├── scripts/            # Database creation and seeding scripts
├── index.php           # Main entry point of the application
├── package.json        # Frontend dependencies and scripts
└── ...                 # Other configuration files
```

## Getting Started

### Prerequisites
- A WAMP (Windows, Apache, MySQL, PHP) server installed.
- [Node.js and npm](https://nodejs.org/) installed.

### Installation

1.  **Clone the Repository**:
    ```bash
    git clone <repository-url>
    ```

2.  **Backend Setup**:
    - Place the project folder inside your WAMP server's `www` directory (e.g., `c:/wamp64/www/TelephoneXchange`).
    - Start your WAMP server services (Apache & MySQL).

3.  **Database Setup**:
    - Open phpMyAdmin or any MySQL client.
    - Run the script `scripts/01_create_database_schema.sql` to create the necessary database and tables.
    - (Optional) Run `scripts/02_insert_default_data.sql` to populate the database with initial sample data.
    - Update the database credentials in `config/database.php` to match your local setup.

4.  **Frontend Setup**:
    - Navigate to the project's root directory in your terminal:
      ```bash
      cd c:\wamp64\www\TelephoneXchange
      ```
    - Install the required Node.js packages:
      ```bash
      npm install
      ```

### Running the Application

- Access the application by navigating to `http://localhost/TelephoneXchange/` in your web browser.
- For frontend development with hot-reloading (if configured in `package.json`):
  ```bash
  npm run dev
  ```

## Usage

- **Reception**: Navigate to the main dashboard to use the Call Intake Form and monitor active calls.
- **Billing**: Go to the Billing page to generate new invoices and view the history of all bills.
- **Maintenance**: Access the Maintenance section to report new faults or check the status of existing maintenance tickets.
