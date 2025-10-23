# FYZO Backend API

Node.js + Express + MongoDB Atlas backend for the FYZO mobile application.

## 🚀 Tech Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Database**: MongoDB Atlas (Cloud)
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Cloudinary
- **Payment**: Stripe
- **Email**: Nodemailer
- **Security**: Helmet, CORS, Rate Limiting, Mongo Sanitize

## 📦 Installation

### Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)
- MongoDB Atlas account
- Cloudinary account (for image uploads)
- Stripe account (for payments)

### Setup Steps

1. **Clone the repository and navigate to backend:**
```bash
cd Backend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Create environment file:**
```bash
cp .env.example .env
```

4. **Configure environment variables:**
Edit the `.env` file with your credentials:
- MongoDB Atlas connection string
- JWT secret key
- Cloudinary credentials
- Stripe API keys
- Email service credentials

5. **Start development server:**
```bash
npm run dev
```

6. **Start production server:**
```bash
npm start
```

## 🔧 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment (development/production) | Yes |
| `PORT` | Server port (default: 5000) | Yes |
| `MONGODB_URI` | MongoDB Atlas connection string | Yes |
| `JWT_SECRET` | Secret key for JWT tokens | Yes |
| `JWT_EXPIRE` | JWT expiration time (e.g., 7d) | Yes |
| `CLIENT_URL` | Frontend URL for CORS | Yes |
| `CLOUDINARY_*` | Cloudinary credentials | Optional |
| `STRIPE_*` | Stripe API keys | Optional |
| `EMAIL_*` | Email service configuration | Optional |

## 📂 Project Structure

```
Backend/
├── src/
│   ├── config/          # Configuration files
│   │   └── database.js  # MongoDB connection
│   ├── controllers/     # Route controllers
│   ├── models/          # Mongoose models
│   ├── routes/          # API routes
│   ├── middleware/      # Custom middleware
│   ├── utils/           # Utility functions
│   └── server.js        # Entry point
├── .env.example         # Example environment variables
├── .gitignore          # Git ignore file
├── package.json        # Dependencies and scripts
└── README.md           # This file
```

## 🛠️ Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests with Jest
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## 🔐 Security Features

- **Helmet**: Security headers
- **CORS**: Cross-Origin Resource Sharing
- **Rate Limiting**: Prevent DDoS attacks
- **Mongo Sanitize**: Prevent NoSQL injection
- **JWT**: Secure authentication
- **bcryptjs**: Password hashing
- **HPP**: HTTP Parameter Pollution protection

## 📡 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `GET /api/v1/auth/logout` - Logout user
- `GET /api/v1/auth/me` - Get current user

### Health Check
- `GET /health` - Check server status

## 🗄️ MongoDB Atlas Setup

1. Create a MongoDB Atlas account
2. Create a new cluster
3. Set up database user credentials
4. Whitelist your IP address (or use 0.0.0.0/0 for development)
5. Get your connection string
6. Add it to your `.env` file

## 🚀 Deployment

### Recommended Platforms
- **Heroku**
- **AWS EC2/Elastic Beanstalk**
- **DigitalOcean**
- **Vercel** (for serverless)
- **Railway**
- **Render**

### Environment Variables in Production
Make sure to set all required environment variables in your hosting platform.

## 📝 Notes

- Always use HTTPS in production
- Keep your `.env` file secure and never commit it
- Use strong JWT secrets in production
- Enable MongoDB Atlas IP whitelist for security
- Implement proper error logging
- Set up monitoring and alerts

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📄 License

MIT License

## 📧 Support

For support, email support@fyzo.io
