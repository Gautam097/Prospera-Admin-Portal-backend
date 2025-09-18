# Node.js Backend API

A scalable Node.js backend API built with Express, PostgreSQL, and Prisma.

## Features

- 🚀 Express.js web framework
- 🗄️ PostgreSQL database with Prisma ORM
- 🔐 JWT authentication
- 📝 Input validation
- 🛡️ Security middleware (Helmet, CORS, Rate limiting)
- 📊 Logging with Winston
- 🧪 Testing with Jest
- 🐳 Docker support
- 📚 API documentation ready

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL
- Redis (optional)

### Installation

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:

```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. Set up the database:

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed the database
npm run db:seed
```

4. Start the development server:

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## Available Scripts

- `npm start` - Start production server
- `npm run format` - Format the code
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed the database
- `npm run db:studio` - Open Prisma Studio

## Docker

Run with Docker:

```bash
docker-compose up
```

## Project Structure

```
src/
├── config/          # Configuration files
├── controllers/     # Route controllers
├── middleware/      # Express middleware
├── models/         # Database models
├── routes/         # API routes
├── services/       # Business logic
├── utils/          # Utility functions
├── validators/     # Input validation
└── app.js         # Express app setup
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.
