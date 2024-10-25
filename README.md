# MoveOut Project

MoveOut is a web application designed to manage customer labels, including features for creating, updating, and viewing labels with associated files like images and audio.

## Table of Contents

-   [Features](#features)
-   [Technologies Used](#technologies-used)
-   [Installation](#installation)
-   [Usage](#usage)
-   [Contributing](#contributing)
-   [License](#license)

## Features

-   Create, update, and soft delete labels
-   Upload multiple images and audio files
-   QR-code leading to description
-   Set your label to private if it contains sensitive information.
    The Qr code will show the description unless you're the owner or if
    you possess a 6-digit passkey.
-   User authentication and email verification
-   Responsive design for a seamless user experience

## Technologies Used

-   **Frontend:** React
-   **Backend:** Node.js with Express
-   **Database:** MariaDB
-   **File Upload:** Multer
-   **Styling:** CSS (default styles provided by React)

## Installation

-   The .env-files are part of the git uploads so you don't have to create new ones.

-   **FIRST ADMIN**
    There is no function promoting the first admin. To promote your first admin you'll have to register as a regular user and then:

```bash
        mariadb moveout
        UPDATE customer SET role='admin' WHERE `customer_id` = #YourCustomerId
```

-   \*\*OR

```bash
        UPDATE customer SET role='admin' WHERE `mail` = '#YourMail'
```

-   If you are unsure of your customer_id or mail you can check with

```bash
        SELECT * FROM customer;
```

    and look for your customer details in the provided list of customers if any.

-   **SETUP BACKEND - FROM ROOT**

```bash
    cd moveout-backend
```

```bash
    npm install
```

-   **SETUP FRONTEND FROM ROOT**

```bash
cd moveout-frontend
```

```bash
npm install
```

### Run the project

```bash
    cd moveout-backend
        npm start
```

```bash
    cd ../moveout-frontend
        npm start
```

-   **RESET DATABASE FROM ROOT**

```bash
cd moveout-backend/sql/moveout
mariadb moveout
source reset.sql;
```

### Usage

-   Make sure MariaDB is running on your machine before starting the backend.
-   Access the frontend by visiting http://localhost:3001 (or the port specified in your .env file).
-   Access the backend by visiting http://localhost:3000 (or the port specified in you .env file)

### Prerequisites

-   **Make sure you have the following installed on your machine:**

-   Node.js (v16 or higher) - Created using v.18.20.4
-   npm (v8 or higher) - Created using v.10.7.0
-   MariaDB

-   If you don't know how to check version:

```bash
    node -v #(Check Node.js)
    npm -v #(Check npm)
```

### Testing

-   Testing can be done by using the website. This is the only way I have tested it.

### Clone the Repository

-   1. Clone the repository from GitHub:

```bash
    git clone https://github.com/IsakAAndersson/moveout.git
```

### Contributing

-   Feel free to submit issues, fork the repository, and make pull requests.

### License

This project is licensed under the MIT license - see the license.txt file for details.
