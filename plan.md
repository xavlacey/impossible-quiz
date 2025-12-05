⏺ Updated Quiz App Implementation Plan

Tech Stack

- Framework: Next.js 14+ (App Router)
- Language: TypeScript
- Database: PostgreSQL with Prisma ORM
- Real-time: Pusher or Ably (or Socket.io)
- Styling: Tailwind CSS (mobile-first)
- State Management: React Context + hooks

Data Models (Final)

model Party {
id String @id @default(cuid())
code String @unique // 6-digit code for contestants
hostId String @unique // Secret token for quizmaster
createdAt DateTime @default(now())
status PartyStatus @default(LOBBY)
currentQuestion Int @default(1) // For display/tracking only
totalQuestions Int @default(10)
correctAnswers Json? // { "1": 42, "2": 100, ... } - set at end
contestants Contestant[]
answers Answer[]
}

model Contestant {
id String @id @default(cuid())
name String
partyId String
party Party @relation(fields: [partyId], references: [id])
answers Answer[]
createdAt DateTime @default(now())

    @@unique([partyId, name]) // No duplicate names in same party

}

model Answer {
id String @id @default(cuid())
partyId String
party Party @relation(fields: [partyId], references: [id])
contestantId String
contestant Contestant @relation(fields: [contestantId], references: [id])
questionNumber Int // 1 to totalQuestions
value Float
submittedAt DateTime @default(now())
updatedAt DateTime @updatedAt

    @@unique([partyId, contestantId, questionNumber])

}

enum PartyStatus {
LOBBY // Waiting for contestants to join
ACTIVE // Quiz in progress
FINISHED // Quiz ended, scores calculated
}

Application Flow

1. Quizmaster Creates Party

Home → Click "Host Quiz" → Set total questions (default 10)
↓
Party created with: - code: "ABC123" (shown to quizmaster) - hostId: "secret-uuid-token" (stored in cookie/session)
↓
Redirect to /quiz/host/[hostId]

2. Contestants Join

Home → Enter code "ABC123" → Enter name
↓
POST /api/party/join
↓
Redirect to /quiz/player/[contestantId]

3. During Quiz

Quizmaster:

- Reads questions aloud (not shown in app)
- Updates current question number (for visual tracking)
- Sees live grid of who has answered what
- Cannot see actual answer values

Contestants:

- See all questions (1 through totalQuestions)
- Can enter/edit any answer at any time
- See which questions they've answered
- Real-time auto-save on input changes

4. End of Quiz

Quizmaster clicks "End Quiz":
Status changes to FINISHED
↓
Modal appears: "Enter Correct Answers"
Q1: [_____]
Q2: [_____]
...
Q10: [____]

    [Calculate Scores]
    ↓

Scores calculated and leaderboard shown

API Routes

Party Management

// POST /api/party/create
{
totalQuestions: number
}
→ Returns { code, hostId }

// POST /api/party/join
{
code: string,
name: string
}
→ Returns { contestantId, partyId }

// GET /api/party/[code]/info
→ Returns { status, totalQuestions } (public info)

Quiz Control (Quizmaster Only)

// GET /api/quiz/host/[hostId]/status
→ Returns {
party: { code, status, currentQuestion, totalQuestions },
contestants: [{
id, name,
answeredQuestions: number[], // [1, 2, 5, 7]
totalAnswered: number
}]
}

// PUT /api/quiz/host/[hostId]/current-question
{ currentQuestion: number }
→ Updates display tracker

// POST /api/quiz/host/[hostId]/finish
{
correctAnswers: { [questionNumber: string]: number }
// { "1": 42, "2": 100, "3": 7.5, ... }
}
→ Sets status to FINISHED, calculates scores
→ Returns leaderboard

Answer Submission (Contestants)

// PUT /api/quiz/player/[contestantId]/answer
{
questionNumber: number,
value: number
}
→ Upserts answer (create or update)
→ Broadcasts to quizmaster (without value)

// GET /api/quiz/player/[contestantId]/answers
→ Returns contestant's current answers
[
{ questionNumber: 1, value: 42 },
{ questionNumber: 3, value: 100 },
...
]

Scoring Logic

function calculateFinalScores(
party: Party,
allAnswers: Answer[],
correctAnswers: Record<number, number>
): LeaderboardEntry[] {

    const contestantScores = new Map<string, { name: string, total: number }>();

    // Initialize all contestants with 0
    party.contestants.forEach(c => {
      contestantScores.set(c.id, { name: c.name, total: 0 });
    });

    // Calculate score for each question
    for (let q = 1; q <= party.totalQuestions; q++) {
      const correctAnswer = correctAnswers[q];
      if (!correctAnswer) continue;

      const questionAnswers = allAnswers.filter(a => a.questionNumber === q);

      // Find minimum distance (for "nearest" bonus)
      const distances = questionAnswers.map(a => ({
        contestantId: a.contestantId,
        value: a.value,
        distance: Math.abs(a.value - correctAnswer)
      }));

      const minDistance = Math.min(...distances.map(d => d.distance));

      // Score each answer
      distances.forEach(d => {
        let score = 0;

        // Within ±10%: 15 points
        const percentDiff = Math.abs((d.value - correctAnswer) / correctAnswer) * 100;
        if (percentDiff <= 10) {
          score += 15;
        }

        // Nearest answer: 10 points (can be multiple if tied)
        if (d.distance === minDistance) {
          score += 10;
        }

        const contestant = contestantScores.get(d.contestantId)!;
        contestant.total += score;
      });
    }

    // Convert to array and sort
    return Array.from(contestantScores.entries())
      .map(([id, data]) => ({
        contestantId: id,
        name: data.name,
        totalScore: data.total
      }))
      .sort((a, b) => b.totalScore - a.totalScore);

}

Real-time Events

// Subscribe to party-specific channels

// Contestants & Quizmaster both subscribe to:
`party-${partyId}` - contestant_joined: { name } - contestant_left: { name } - current_question_changed: { questionNumber } - quiz_ended: {} - scores_ready: { leaderboard }

// Only Quizmaster subscribes to:
`party-${partyId}-host` - answer_submitted: { contestantId, contestantName, questionNumber } - answer_updated: { contestantId, contestantName, questionNumber }

Page Structure

/app
/page.tsx # Home (create or join)
/quiz
/host
/[hostId]
/page.tsx # Quizmaster dashboard
/player
/[contestantId]
/page.tsx # Contestant view
/api
/party
/create/route.ts
/join/route.ts
/[code]/info/route.ts
/quiz
/host/[hostId]
/status/route.ts
/current-question/route.ts
/finish/route.ts
/player/[contestantId]
/answer/route.ts
/answers/route.ts

Component Breakdown

/components
/party
PartyCode.tsx # Display party code prominently
CreatePartyForm.tsx # Set total questions
JoinPartyForm.tsx # Enter code + name

    /quiz
      /host
        AnswerStatusGrid.tsx            # Grid showing ✓/- per contestant per Q
        QuestionNavigator.tsx           # ◀ Current Q: 3 ▶
        EndQuizModal.tsx                # Enter all correct answers
        Leaderboard.tsx                 # Final scores

      /player
        QuestionList.tsx                # All questions with inputs
        QuestionInput.tsx               # Single question input field
        SubmissionIndicator.tsx         # ✓ or - indicator

    /ui
      Button.tsx
      Input.tsx
      Card.tsx
      Modal.tsx

Mobile-First UI Design

Player View (Mobile)

┌─────────────────────────────────┐
│ Quiz: ABC123 [3/10] │
├─────────────────────────────────┤
│ │
│ Question 1 ✓ │
│ ┌─────────────────────────┐ │
│ │ 42 │ │
│ └─────────────────────────┘ │
│ │
│ Question 2 ✓ │
│ ┌─────────────────────────┐ │
│ │ 100 │ │
│ └─────────────────────────┘ │
│ │
│ Question 3 ← CURRENT │
│ ┌─────────────────────────┐ │
│ │ [____] │ │
│ └─────────────────────────┘ │
│ │
│ Question 4 │
│ ┌─────────────────────────┐ │
│ │ [____] │ │
│ └─────────────────────────┘ │
│ │
│ ... │
│ │
└─────────────────────────────────┘

Quizmaster View (Mobile)

┌─────────────────────────────────┐
│ Party Code: ABC123 │
│ ◀ Question 3 ▶ │
├─────────────────────────────────┤
│ │
│ 1 2 3 4 5 6 7 8 9 10 │
│ Alice ✓ ✓ ✓ ✓ ✓ ✓ ✓ ✓ ✓ ✓ 10 │
│ Bob ✓ ✓ ✓ ✓ ✓ ✓ ✓ ✓ ✓ - 9 │
│ Carol ✓ ✓ ✓ ✓ ✓ ✓ ✓ - - - 7 │
│ │
│ ┌───────────────────────────┐ │
│ │ End Quiz & Score │ │
│ └───────────────────────────┘ │
└─────────────────────────────────┘

Implementation Phases

Phase 1: Project Setup (Foundation)

- Initialize Next.js 14 with TypeScript
- Set up Prisma with PostgreSQL
- Configure Tailwind CSS
- Create basic layout and routing structure
- Set up real-time service (Pusher/Ably)

Phase 2: Party Management

- Implement party creation with code generation
- Build join flow with validation
- Create contestant registration
- Set up session/cookie management for hostId
- Add real-time contestant join/leave events

Phase 3: Quiz Flow - Player Side

- Build contestant answer view (all questions)
- Implement answer submission (upsert)
- Add auto-save on input change
- Show submission indicators (✓)
- Handle quiz end state for players

Phase 4: Quiz Flow - Quizmaster Side

- Create answer status grid component
- Implement current question tracker
- Add real-time answer status updates (without values)
- Build end quiz modal with correct answer inputs
- Show contestant count and status

Phase 5: Scoring System

- Implement scoring algorithm
- Calculate nearest answer(s) with tie handling
- Calculate ±10% bonus
- Aggregate scores across all questions
- Build leaderboard component
- Broadcast final scores to all participants

Phase 6: Polish & Production

- Add loading states and optimistic updates
- Error handling and validation
- Mobile-responsive design refinement
- Add party expiration/cleanup
- Handle edge cases (player disconnect, etc.)
- Add basic animations/transitions
- Testing and bug fixes

Security & Validation

- Party codes: 6-digit alphanumeric, uppercase only
- Host authentication: UUID-based hostId in httpOnly cookie
- Rate limiting: On party creation and answer submission
- Input validation:
  - Answer values must be numbers
  - Question numbers must be 1-totalQuestions
  - Names must be unique per party
- Authorization:
  - Only hostId can end quiz and enter correct answers
  - Only contestantId can submit answers for themselves
  - Prevent answer submission after quiz ends

Environment Variables

DATABASE_URL="postgresql://..."
PUSHER_APP_ID="..."
PUSHER_KEY="..."
PUSHER_SECRET="..."
PUSHER_CLUSTER="..."
NEXT_PUBLIC_PUSHER_KEY="..."
NEXT_PUBLIC_PUSHER_CLUSTER="..."
