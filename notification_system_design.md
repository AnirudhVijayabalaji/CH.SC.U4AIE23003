Stage 1: Notification System Design
Overview & Core Actions
For this campus platform, the goal is to keep students updated in real-time without draining server resources. I've identified four essential actions that the API must handle:

1. Fetch Unread Notifications: This is the most frequent call. It needs to be lightweight to avoid lag on page load.
2. Mark as Read: Critical for user experience. We need to handle single read actions as well as mark all as read in the future.
3. Fetch History: A standard paginated view for students who want to look back at past results or events.
4. Real-time Stream: The backbone of the instant feel of the platform.

REST API Endpoints

1. GET /api/v1/notifications/unread
Dev Note: I kept this endpoint separate from the history to ensure we can cache unread counts effectively.

Headers:
- Authorization: Bearer <JWT_TOKEN> (Standard JWT for security)
- Content-Type: application/json

Sample Response:
```json
{
  "status": "success",
  "data": {
    "count": 2,
    "notifications": [
      {
        "id": "uuid-1",
        "type": "Placement",
        "title": "Google Recruitment",
        "message": "Google is visiting campus for 2024 batches.",
        "createdAt": "2023-10-01T10:00:00Z",
        "isRead": false
      }
    ]
  }
}
```

---

Real-time Delivery: WebSockets
I chose WebSockets (Socket.io) over Server-Sent Events (SSE) or long-polling. 
- Reasoning: WebSockets provide a full-duplex connection. This means the client can acknowledge receipt of a notification instantly. For a campus with 50,000 students, keeping a socket open is actually more efficient than having 50,000 browsers hit the unread endpoint every 5 seconds (polling).
- Security: The connection is authenticated via JWT during the initial handshake.

Stage 2: Persistent Storage

Database Selection: PostgreSQL
I recommend PostgreSQL instead of a NoSQL database like MongoDB.

The Why:
- Data Integrity: Notifications for Placements or Results are sensitive. We can't afford eventual consistency issues where a student thinks they missed a drive. Postgres gives us ACID compliance.
- Relational Power: We need to join notifications with the Students table frequently. SQL handles these relationships much more predictably.
- JSONB Flexibility: If we ever need to store custom metadata for a specific notification type, Postgres allows us to store it in a JSONB column while still keeping the rest of the data structured.

Scalability Strategy
As we grow to millions of rows, a single table will slow down. My plan:
1. Partitioning: I'll partition the notifications table by created_at (e.g., one partition per month). This keeps the active indexes small.
2. Caching: I'll use Redis specifically to store the Unread Count. Incrementing a counter in Redis is much faster than running COUNT(*) in SQL.

Stage 3: Query Optimization & Indexing
Analyzing the Slow Query
The current query SELECT * FROM notifications WHERE studentID = 1042 AND isRead = false ORDER BY createdAt DESC; is hitting a Full Table Scan.

The Problem:
- The DB is looking through every notification to find student 1042. 
- Sorting by createdAt at the end adds extra CPU overhead.

The Fix (Composite Index):
```sql
CREATE INDEX idx_student_unread_recency 
ON notifications (student_id, is_read, created_at DESC);
```
This index allows the DB to seek directly to the student's unread notifications already in the correct order.

Warning on Index Everything:
A colleague suggested indexing every column. This is a bad idea because:
1. Write Lag: Every new notification will slow down the system because the DB has to update 10 different indexes.
2. Disk Bloat: Indexes can eventually take up more space than the actual data.

Stage 4: Performance Tradeoffs

To solve the Database Overwhelmed issue, we have two main strategies:

| Strategy | Pros | Cons |
| :--- | :--- | :--- |
| Redis Caching | Sub-millisecond response time. | Cache invalidation is hard. |
| Materialized Views | Very fast reads for complex stats. | Data isn't live. |

My Recommendation: Use Redis for the Unread List (short TTL) and let the history fetch go to the DB (which is now fast thanks to our composite index).

Stage 5: The Notify All Challenge

Shortcomings of the original code:
The loop for student_id in student_ids is a disaster waiting to happen. If the 100th student's email provider times out, the remaining 49,900 students get nothing.

Reliable Redesign:
We need an Async Worker Pattern.
1. The Notify All button should only do ONE thing: Create a record in a Broadcasts table and push a task to a queue (like RabbitMQ).
2. Workers pull from this queue. If an email fails for one student, the worker logs it and retries only for that student.
3. DB vs Email: These should never happen in the same synchronous block. DB first, then trigger the email asynchronously.

Stage 6: Priority Inbox Logic

Ranking Algorithm
I've implemented a weighted sorting approach in priority_inbox.js.
- Logic: Placement (Weight 3) > Result (Weight 2) > Event (Weight 1).
- Tie-breaker: If weights are equal, the most recent timestamp wins.

This ensures that a placement drive from 2 hours ago stays above a cultural fest announcement from 10 minutes ago, ensuring students don't miss career-critical info.

