# ReWear Frontend

A React-based frontend for the ReWear clothing exchange platform.

## Features

- **User Authentication**: Register, login, and logout functionality
- **Item Management**: Add, view, and manage clothing items
- **Points System**: Earn points for various activities
- **Admin Panel**: Admin interface for managing users and items
- **Real-time API Integration**: Connected to the backend API

## API Integration

The frontend is now fully integrated with the backend API running on `http://localhost:3001`. Key integrations include:

### Authentication
- User registration and login via `/api/auth` endpoints
- JWT token-based authentication
- Protected routes for authenticated users

### Items
- Fetch items from `/api/items` endpoint
- Upload images via `/api/upload/image` endpoint
- Item creation, viewing, and management

### User Dashboard
- Fetch user data and dashboard statistics from `/api/auth/dashboard`
- Display user items, swaps, and points

### Admin Features
- Admin-only routes and functionality
- User management via `/api/admin/users`
- Item approval via `/api/admin/items`
- Swap management via `/api/admin/swaps`

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Make sure the backend server is running on `http://localhost:3001`

## Environment Variables

The frontend is configured to connect to the backend API. The API base URL is set in `src/api.js`.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Project Structure

```
src/
├── components/          # Reusable components
├── pages/              # Page components
├── utils/              # Utility functions
├── api.js              # API configuration
└── App.jsx             # Main app component
```

## Backend Integration Status

✅ **Completed Integrations:**
- User authentication (login/register)
- Item creation and management
- Dashboard data fetching
- Admin panel functionality
- Image upload
- Protected routes
- Logout functionality

The frontend is now fully connected to the backend API and ready for use!
