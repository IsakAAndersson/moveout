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

-   **SETUP BACKEND**

```bash
    cd moveout-backend
```

```bash
    npm install
```

-   **SETUP FRONTEND**

```bash
cd moveout-frontend
```

```bash
npm install
```

######

######

-   **MariaDB Installation Guide**

If you don't have MariaDB installed on your machine, follow the instructions below for your operating system.

### Windows

1. **Download the Installer:**

    - Visit the [MariaDB download page](https://mariadb.org/download/).
    - Select the latest stable version and download the Windows MSI installer.

2. \*\*Run the Installer:

    - Double-click the downloaded MSI file to start the installation.
    - Follow the prompts in the installation wizard.

3. \*\*Set the Root Password:

    - During installation, you'll be prompted to set a root password. Make sure to remember it, as you'll need it to access the database.

4. \*\*Finish Installation:
    - Once the installation is complete, you can start MariaDB from the Start menu or use the command prompt.

### macOS

1. \*\*Install Homebrew (if not already installed):

    - Open your terminal and run the following command to install Homebrew:

```bash
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

2. \*\*Install MariaDB:

    - Once Homebrew is installed, run the following command:

```bash
        brew install mariadb
```

3. \*\*Start MariaDB:

    - Start the MariaDB service with the command:

```bash
        brew services start mariadb
```

4. \*\*Secure the Installation:

    - Run the following command to set a root password and secure your installation:

```bash
        mysql_secure_installation
```

### Linux (Ubuntu)

1. \*\*Update Package Index:

    - Open your terminal and run the following command:

```bash
        sudo apt update
```

2. \*\*Install MariaDB:

    - Install MariaDB with the following command:

```bash
        sudo apt install mariadb-server
```

3. \*\*Secure the Installation:

    - After installation, run the security script:

```bash
        sudo mysql_secure_installation
```

    - Follow the prompts to set a root password and secure your installation.

4. \*\*Start MariaDB:

    - Ensure the MariaDB service is running:

```bash
        sudo systemctl start mariadb
```

    - You can also enable it to start on boot:

```bash
        sudo systemctl enable mariadb
```

### Verify the Installation

To verify that MariaDB is installed and running, open your terminal (or command prompt) and type:

```bash
mysql -u root -p
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

######

######

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

### Clone the Repository

-   1. Clone the repository from GitHub:

```bash
    git clone https://github.com/IsakAAndersson/moveout.git
```

### Contributing

-   Feel free to submit issues, fork the repository, and make pull requests.

### License

This project is licensed under the MIT license - see the license.txt file for details.
