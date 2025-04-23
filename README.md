# Swagger API to Chat

This project is a React + TypeScript application built with Vite. It integrates Swagger APIs to enable a chat-based interface for interacting with backend services.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Setup Instructions](#setup-instructions)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [Development Notes](#development-notes)

---

## Prerequisites

Before setting up the project, ensure you have the following installed:

1. **Node.js** (v16 or higher) - [Download Node.js](https://nodejs.org/)
2. **npm** (comes with Node.js) or **yarn** (optional) - [Install Yarn](https://yarnpkg.com/)
3. **Git** (optional, for version control) - [Download Git](https://git-scm.com/)

---

## Setup Instructions

Follow these steps to set up the project on your local machine:

1. **Clone the Repository**:
   ```bash
   git clone <repository-url>
   cd SwaggerApiToChat
   ```

2. **Install Dependencies**:
   Run the following command to install all required dependencies:
   ```bash
   npm install
   ```

3. **Set Up Environment Variables**:
   Create a `.env` file in the root directory and add the following variables:
   ```env
   VITE_API_BASE_URL=https://localhost:7049
   ```

4. **Start the Development Server**:
   Run the following command to start the development server:
   ```bash
   npm run dev
   ```

5. **Access the Application**:
   Open your browser and navigate to `http://localhost:5173`.

---

## Available Scripts

Here are the scripts you can use during development:

- **Start Development Server**:
  ```bash
  npm run dev
  ```

- **Build for Production**:
  ```bash
  npm run build
  ```

- **Preview Production Build**:
  ```bash
  npm run preview
  ```

- **Lint the Code**:
  ```bash
  npm run lint
  ```

---

## Project Structure

Here is an overview of the project structure:

```
├── public/                # Static assets
│   └── ais.svg            # Logo
├── src/                   # Source code
│   ├── App.tsx            # Main application component
│   ├── main.tsx           # Entry point
│   ├── token_util.ts      # Token management utility
│   ├── index.css          # Global styles
│   └── vite-env.d.ts      # Vite environment types
├── .gitignore             # Git ignore rules
├── eslint.config.js       # ESLint configuration
├── index.html             # HTML template
├── package.json           # Project metadata and scripts
├── tsconfig.json          # TypeScript configuration
├── tsconfig.app.json      # App-specific TypeScript config
├── tsconfig.node.json     # Node-specific TypeScript config
├── vite.config.ts         # Vite configuration
└── README.md              # Project documentation
```

---

## Development Notes

1. **Backend API**:
   - The application interacts with a backend API hosted at `https://localhost:7049`.
   - Ensure the backend is running before starting the application.

2. **Swagger JSON**:
   - Upload a Swagger JSON file in the application to enable API-based interactions.

3. **Text-to-Speech and Speech-to-Text**:
   - The project uses the Microsoft Cognitive Services Speech SDK for TTS and STT functionalities.
   - Ensure you have valid credentials for the Speech SDK.

4. **Debugging**:
   - Use the Debug Console in the application to view API responses and debug information.

5. **Linting**:
   - The project uses ESLint for code quality checks. Run `npm run lint` to identify and fix issues.

---

For any issues or questions, feel free to reach out to the project maintainers.