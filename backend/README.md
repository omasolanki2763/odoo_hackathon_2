# ReWear Backend API

A sustainable clothing exchange platform backend built with Node.js, Express, and MongoDB.

## 🚀 Features

- **User Authentication**: JWT-based authentication with email/password
- **Item Management**: Upload, browse, and manage clothing items
- **Swap System**: Direct item swaps and point-based redemptions
- **Points System**: Earn and spend points for clothing items
- **Admin Panel**: Moderation tools for items and users
- **Notifications**: Real-time notifications for users
- **Image Upload**: Cloudinary integration for image storage
- **Search & Filter**: Advanced search and filtering capabilities

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud)
- Cloudinary account (for image uploads)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd rewear-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
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
   ```

4. **Start the server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## 📚 API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password
- `GET /api/auth/dashboard` - Get user dashboard

### Items Endpoints

- `GET /api/items` - Get all items (with filters)
- `GET /api/items/featured` - Get featured items
- `GET /api/items/search` - Search items
- `GET /api/items/:id` - Get item by ID
- `POST /api/items` - Create new item
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item

### Swaps Endpoints

- `GET /api/swaps` - Get user's swaps
- `GET /api/swaps/:id` - Get swap by ID
- `POST /api/swaps` - Create swap request
- `PUT /api/swaps/:id/accept` - Accept swap
- `PUT /api/swaps/:id/reject` - Reject swap
- `PUT /api/swaps/:id/complete` - Complete swap
- `PUT /api/swaps/:id/cancel` - Cancel swap

### Admin Endpoints

- `GET /api/admin/dashboard` - Admin dashboard stats
- `GET /api/admin/items/pending` - Get pending items
- `PUT /api/admin/items/:id/approve` - Approve item
- `PUT /api/admin/items/:id/reject` - Reject item
- `PUT /api/admin/users/:id/suspend` - Suspend user
- `PUT /api/admin/users/:id/ban` - Ban user

### Notifications Endpoints

- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read
- `GET /api/notifications/unread/count` - Get unread count

## 🗄️ Database Schema

### Collections

1. **Users** - User profiles and authentication
2. **Items** - Clothing items with details
3. **Swaps** - Swap requests and transactions
4. **Notifications** - User notifications
5. **PointsTransactions** - Points history
6. **AdminActions** - Admin moderation logs
7. **Categories** - Clothing categories

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3000` |
| `MONGODB_URI` | MongoDB connection string | - |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_EXPIRES_IN` | JWT expiration time | `7d` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | - |
| `CLOUDINARY_API_KEY` | Cloudinary API key | - |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | - |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` |

## 🚀 Deployment

### Railway (Recommended)

1. Connect your GitHub repository to Railway
2. Add environment variables in Railway dashboard
3. Deploy automatically

### Other Platforms

- **Heroku**: Add MongoDB addon and set environment variables
- **Render**: Connect GitHub repo and configure environment
- **DigitalOcean**: Deploy to App Platform

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 📝 Scripts

```bash
# Development
npm run dev

# Production
npm start

# Testing
npm test

# Database seeding
npm run seed
```

## 🔒 Security Features

- JWT authentication
- Password hashing with bcrypt
- Rate limiting
- Input validation
- CORS protection
- Helmet security headers
- File upload validation

## 📊 Monitoring

- Request logging with Morgan
- Error handling middleware
- Custom logger utility
- Health check endpoint

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, email support@rewear.com or create an issue in the repository.

---

**ReWear** - Sustainable Fashion Exchange Platform 