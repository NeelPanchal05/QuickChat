# QuickChat Frontend

This is the frontend component of the QuickChat application, providing a modern, responsive user interface for real-time messaging.

## Technology Stack

The QuickChat frontend is built securely and efficiently with the following core technologies:

- **React**: Component-based UI rendering.
- **Tailwind CSS**: Utility-first CSS framework for rapid UI styling.
- **Radix UI Primitives**: Unstyled, accessible React components serving as the foundation of our design system.
- **Socket.IO Client**: Establishes bidirectional, low-latency communication with the backend for real-time chat updates.
- **React Hook Form & Zod**: For managing form state, client-side validation, and schema definitions securely.
- **Axios**: Promised-based HTTP client for interacting with the backend REST APIs.
- **CRACO**: Configuration routing for Create React App, providing flexibility for custom Webpack configurations.

## Setup Instructions

### Prerequisites
- Node.js installed
- Yarn package manager

### Installation

1. From the `frontend` folder, install all required dependencies:
```bash
yarn install
```

### Environment Configuration

For development, ensure that your application knows where the backend server is located.
If there are environment variables needed, create a `.env` file in the root of the `frontend` directory:

```env
REACT_APP_API_URL=http://localhost:8000
```
*(Check with backend guidelines for exact required environment variables.)*

## Available Scripts

In the frontend directory, you can run:

### `yarn start`

Runs the app in development mode.
Open [http://localhost:3000](http://localhost:3000) to view it in your browser. The page will reload when you make changes.

### `yarn build`

Builds the app for production to the `build` folder.
It correctly bundles React in production mode and optimizes the build for the best performance. The build is minified and the filenames include the hashes.

### `yarn test`

Launches the test runner for this project in the interactive watch mode.
