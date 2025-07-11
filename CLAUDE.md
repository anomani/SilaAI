# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SilaAI (formerly "Uzi") is a comprehensive barbershop automation platform that combines AI-powered client management, appointment scheduling, and multi-channel communication. The application is built as a full-stack solution with a React Native mobile frontend and Node.js backend.

## Common Development Commands

### Backend Development
```bash
# Start backend server
cd backend && npm start

# Run backend tests  
cd backend && npm test

# Install backend dependencies
cd backend && npm install
```

### Frontend Development
```bash
# Start Expo development server
cd frontend && npm start

# Run on Android device/emulator
cd frontend && npm run android

# Run on iOS device/simulator  
cd frontend && npm run ios

# Start web development server
cd frontend && npm run web
```

### Full Application
```bash
# Start backend from root (production)
npm start

# Run tests from root
npm test
```

## Architecture Overview

### Backend Architecture (`/backend`)
- **Entry Point**: `index.js` → `src/app.js`
- **Database**: PostgreSQL with schema defined in `src/model/schema.md`
- **API Structure**: RESTful APIs organized by feature domains
- **Real-time Communication**: Socket.io for live updates
- **Background Jobs**: Bull queue system with Redis
- **AI Integration**: Claude (Anthropic) and OpenAI for automation

#### Key Backend Directories:
- `src/routes/`: API endpoint definitions organized by feature
- `src/controllers/`: Business logic for handling requests
- `src/model/`: Database models and schema definitions
- `src/ai/`: AI processing, prompts, and automation tools
- `src/config/`: Configuration, cron jobs, and background workers
- `src/middleware/`: Authentication and request processing
- `src/scraping/`: Web scraping tools for external platforms (Booksy)

### Frontend Architecture (`/frontend`)
- **Framework**: React Native with Expo
- **Navigation**: React Navigation (stack and bottom tabs)
- **State Management**: Context API for global state
- **Real-time**: Socket.io client for live updates
- **Media**: Expo Camera and media libraries

#### Key Frontend Directories:
- `src/screens/`: Main application screens
- `src/components/`: Reusable UI components
- `src/services/`: API communication layer
- `src/utils/`: Helper functions and utilities

## Database Schema

The application uses PostgreSQL with the following core entities:
- **users**: Barber accounts and authentication
- **client**: Customer information and preferences  
- **appointment**: Scheduling and service details
- **messages**: Multi-channel communication history
- **ai_prompts**: Custom AI behavior configuration
- **notes**: Client-specific notes and history

## Key Features & Integration Points

### AI-Powered Automation
- Custom prompt system in `src/ai/Prompts/`
- Automated response generation
- Client data analysis and insights
- Smart scheduling recommendations

### Multi-Channel Communication
- SMS via Twilio integration
- Real-time messaging through Socket.io
- Push notifications via Expo

### External Platform Integration
- **Booksy**: Automated client scraping and data sync
- **Google Cloud Storage**: Media file management
- **Twilio**: SMS communications

### Background Processing
- Cron jobs for automated tasks (`src/config/cronJobs.js`)
- Redis-backed job queues for async operations
- Appointment notifications and reminders

## Testing Configuration

- **Backend**: Jest with Babel transformation
- **Test Location**: `src/**/__tests__/**/*.test.js`
- **Setup**: `jest.setup.js` for test configuration

## Development Notes

### Authentication
- JWT-based authentication system
- Middleware in `src/middleware/authMiddleware.js`
- User session management

### Scraping Operations
- Automated Booksy platform integration
- Client data synchronization
- Chrome browser automation with Puppeteer

### Environment Configuration
- Development, preview, and production environments
- EAS Build system for mobile deployments
- Heroku-compatible backend deployment