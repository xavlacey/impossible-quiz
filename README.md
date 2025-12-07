# Impossible Quiz

A mobile-first web app for hosting in-person quizzes with numerical answers and automatic scoring.

## Demo

The left-hand screen is the host and the other two screens are contestants. In real life the host asks questions that have numerical answers and the contestants type their answers.

https://github.com/user-attachments/assets/6feb7224-80f9-4420-8bf6-17feefe19546



## Features

- **Host Mode**: Create and manage quiz parties with unique codes
- **Contestant Mode**: Join quizzes and submit numerical answers
- **Real-time Updates**: See who's answered in real-time
- **Automatic Scoring**: Smart scoring system (10 pts for nearest, 15 pts for within ±10%)
- **Mobile-First**: Optimized for mobile devices

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Real-time**: Pusher
- **Styling**: Tailwind CSS
- **Runtime**: Bun

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed
- PostgreSQL database
- Pusher account (free tier available)

### Installation

1. **Clone and install dependencies:**

```bash
bun install
```

2. **Set up environment variables:**

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Update the following in `.env`:

- `DB_DATABASE_URL`: Your PostgreSQL connection string
- `PUSHER_APP_ID`, `PUSHER_SECRET`, `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER`: Get these from [Pusher Dashboard](https://dashboard.pusher.com)

3. **Set up the database:**

```bash
# Run migrations
bunx prisma migrate dev --name init

# Generate Prisma client (if not already generated)
bunx prisma generate
```

4. **Run the development server:**

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How It Works

### Quiz Flow

1. **Quizmaster** creates a party and receives a unique code
2. **Contestants** join using the party code and enter their names
3. **Quizmaster** reads questions aloud (not shown in app)
4. **Contestants** enter numerical answers for each question
5. **Quizmaster** can see who has answered (but not the values)
6. At the end, **Quizmaster** enters all correct answers
7. Scores are automatically calculated and displayed

### Scoring System

For each question:

- **Nearest answer**: 10 points
- **Within ±10% of correct answer**: 15 points
- **Both (nearest AND within 10%)**: 25 points total

Multiple contestants can tie for "nearest" if equidistant from the correct answer.

## Project Structure

```
/app
  /page.tsx                          # Home page (create/join)
  /quiz
    /host/[hostId]/page.tsx          # Quizmaster dashboard
    /player/[contestantId]/page.tsx  # Contestant view
  /api                               # API routes (to be implemented)

/components                          # Reusable components (to be implemented)

/lib
  /db/prisma.ts                      # Prisma client singleton
  /realtime
    /pusher-server.ts                # Pusher server config
    /pusher-client.ts                # Pusher client config

/prisma
  /schema.prisma                     # Database schema
```

## Database Schema

- **Party**: Quiz session with code, hostId, status, questions, and correct answers
- **Contestant**: Players in a party
- **Answer**: Numerical answers submitted by contestants

## Development

### Running Database Migrations

```bash
bunx prisma migrate dev
```

### Viewing Database

```bash
bunx prisma studio
```

### Linting

```bash
bun lint
```

### Building for Production

```bash
bun build
```

## License

MIT
