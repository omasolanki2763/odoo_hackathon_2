# ReWear - Sustainable Clothing Exchange Platform

A modern, full-stack web application that enables users to exchange clothing items through direct swaps or a point-based redemption system. Built with React, Node.js, Express, and MongoDB.

## 🏆 Odoo Hackathon Project

This project was developed for the **Odoo Hackathon** by Team 0818:

- **Om** - Full-stack development & project coordination
- **Swayam** - Backend development & API design
- **Darshan** - Frontend development & UI/UX
- **Arth** - Database design & system architecture

### 🎯 Project Vision
ReWear aims to promote sustainable fashion by creating a community-driven platform where users can exchange clothing items, reducing textile waste and promoting circular fashion economy.

## 🌟 Features

### 🔐 User Management
- **Authentication**: Secure JWT-based login/registration
- **User Profiles**: Customizable profiles with points tracking
- **Dashboard**: Personal item management and activity overview

### 👕 Item Management
- **Item Upload**: Multi-image upload with detailed item information
- **Item Browsing**: Advanced search and filtering capabilities
- **Item Details**: Comprehensive item pages with image galleries
- **Status Tracking**: Pending, approved, available, swapped, redeemed

### 🔄 Swap System
- **Direct Swaps**: Item-to-item exchanges between users
- **Point Redemption**: Use points to redeem items without immediate swaps
- **Swap Requests**: Send and manage swap proposals
- **Swap History**: Track all swap activities

### 💰 Points System
- **Earn Points**: Points for uploading items, completing swaps
- **Spend Points**: Redeem items using accumulated points
- **Transaction History**: Complete points activity tracking

### 🛡️ Admin Features
- **Item Moderation**: Approve/reject uploaded items
- **User Management**: Suspend/ban users, view user statistics
- **System Monitoring**: Dashboard with platform statistics
- **Admin Actions**: Logged moderation activities

### 📱 Modern UI/UX
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Dark Theme**: Modern dark interface with blue accents
- **Image Galleries**: Multi-image support with thumbnails
- **Real-time Updates**: Live notifications and status updates

## 🏗️ Architecture

```
ReWear/
├── frontend/          # React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── utils/         # Utility functions
│   │   └── api.js         # API client
│   └── public/            # Static assets
├── backend/           # Node.js/Express API
│   ├── src/
│   │   ├── controllers/   # Route handlers
│   │   ├── models/        # MongoDB schemas
│   │   ├── services/      # Business logic
│   │   ├── middleware/    # Custom middleware
│   │   ├── routes/        # API routes
│   │   └── utils/         # Utility functions
│   └── scripts/           # Database scripts
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd rewear
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Set up environment variables**
   ```bash
   cd ../backend
   cp env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   NODE_ENV=development
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/rewear
   JWT_SECRET=your-super-secret-jwt-key
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   FRONTEND_URL=http://localhost:5173
   ```

5. **Start the development servers**
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev
   
   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000

## 📊 Database Setup

### Seed Sample Data
```bash
cd backend
node scripts/seedItems.js        # Add general sample items
node scripts/addUserItems.js     # Add items to specific user
```

### Database Scripts
- `scripts/seedItems.js` - Add sample items to the platform
- `scripts/addUserItems.js` - Add items to a specific user account
- `scripts/fixPlaceholderUrls.js` - Fix broken image URLs
- `scripts/updateImages.js` - Update items with placeholder images

## 🛠️ Development

### Backend Development
```bash
cd backend
npm run dev          # Start development server
npm test             # Run tests
npm run lint         # Lint code
```

### Frontend Development
```bash
cd frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
```

## 📚 API Documentation

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile
- `GET /api/auth/dashboard` - Get user dashboard

### Items
- `GET /api/items` - Get all items (with filters)
- `GET /api/items/featured` - Get featured items
- `GET /api/items/:id` - Get item by ID
- `POST /api/items` - Create new item
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item

### Swaps
- `GET /api/swaps` - Get user's swaps
- `GET /api/swaps/:id` - Get swap by ID
- `POST /api/swaps` - Create swap request
- `PUT /api/swaps/:id/accept` - Accept swap
- `PUT /api/swaps/:id/reject` - Reject swap

### Admin
- `GET /api/admin/dashboard` - Admin dashboard stats
- `GET /api/admin/items/pending` - Get pending items
- `PUT /api/admin/items/:id/approve` - Approve item
- `PUT /api/admin/items/:id/reject` - Reject item

## 🎨 UI Components

### Pages
- **Landing Page**: Welcome screen with featured items
- **Dashboard**: User's personal items and activity
- **Items Page**: Browse all available items
- **Item Detail**: Detailed view with swap/redeem options
- **Add Item**: Upload new items with images
- **Admin Panel**: Moderation and management tools
- **Swap Detail**: View and manage swap requests

### Key Features
- **Image Galleries**: Multi-image support with thumbnails
- **Responsive Grid**: Adaptive layouts for all screen sizes
- **Modal Dialogs**: Swap requests and confirmations
- **Status Indicators**: Visual status for items and swaps
- **Points Display**: Real-time points balance

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment mode | No |
| `PORT` | Backend server port | No |
| `MONGODB_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | No* |
| `CLOUDINARY_API_KEY` | Cloudinary API key | No* |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | No* |
| `FRONTEND_URL` | Frontend URL for CORS | No |

*Cloudinary is optional - the app will use placeholder images if not configured

### Database Collections
- **Users**: User accounts and profiles
- **Items**: Clothing items with details and images
- **Swaps**: Swap requests and transactions
- **Notifications**: User notifications
- **PointsTransactions**: Points history
- **AdminActions**: Admin activity logs

## 🚀 Deployment

### Backend Deployment
1. Set up MongoDB database (MongoDB Atlas recommended)
2. Configure environment variables
3. Deploy to your preferred platform:
   - **Railway**: Connect GitHub repo
   - **Heroku**: Add MongoDB addon
   - **Render**: Connect GitHub repo
   - **DigitalOcean**: App Platform

### Frontend Deployment
1. Build the application: `npm run build`
2. Deploy the `dist` folder to:
   - **Vercel**: Connect GitHub repo
   - **Netlify**: Drag and drop dist folder
   - **GitHub Pages**: Deploy from GitHub Actions

## 🧪 Testing

### Backend Testing
```bash
cd backend
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage
```

### Frontend Testing
```bash
cd frontend
npm test              # Run all tests
npm run test:ui       # Run tests with UI
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for password security
- **Rate Limiting**: Prevent abuse with request limits
- **Input Validation**: Comprehensive input sanitization
- **CORS Protection**: Configured for frontend-backend communication
- **File Upload Security**: Image validation and size limits
- **Admin Authorization**: Role-based access control

## 📊 Monitoring & Logging

- **Request Logging**: Morgan for HTTP request logging
- **Error Handling**: Comprehensive error middleware
- **Custom Logger**: Structured logging utility
- **Health Checks**: API health monitoring endpoints

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code style and conventions
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting

## 📝 Project Status

This is a hackathon project developed for the Odoo Hackathon 2024. The project is currently in development and not licensed for commercial use.

## 🏆 Team 0818 - Odoo Hackathon 2024

**Team Members:**
- **Om** - Full-stack development & project coordination
- **Swayam** - Backend development & API design  
- **Darshan** - Frontend development & UI/UX
- **Arth** - Database design & system architecture

**Hackathon Details:**
- **Event:** Odoo Hackathon 2024
- **Project:** ReWear - Sustainable Clothing Exchange Platform
- **Technology Stack:** React, Node.js, Express, MongoDB
- **Duration:** 48-hour hackathon project

## 🙏 Acknowledgments

- **React** for the frontend framework
- **Node.js & Express** for the backend API
- **MongoDB** for the database
- **Cloudinary** for image storage (optional)
- **Vite** for fast development and building

## 📞 Support

For support, please open an issue in the GitHub repository or contact the development team.

---

**ReWear** - Making sustainable fashion accessible through community-driven clothing exchange. 