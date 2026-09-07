# Socket Architecture

The backend uses a **unified `new_message` event** for all message operations (new, edit, delete) distinguished by an `eventType` parameter, plus a separate `mark_read` event for read receipts. This reduces redundancy by sharing common logic (conversation lookup, status calculation, broadcast) across all three operations.

---

## Helpers (shared across handlers)

- **`isUserOnline(userId)`** — checks if a user has an active socket room
- **`getOtherParticipants(participants)`** — filters out the current user
- **`ensureUnreadMap(conversation)`** — initializes `unreadCount` Map if missing
- **`getStatus(conversation)`** — returns `"delivered"` if any recipient is online, else `"sent"`
- **`broadcastToConv(conv, eventType, message)`** — emits `new_message` to all participants of a conversation

---

## Events

### 1. `new_message` (unified: new / edit / delete)

Single socket event that branches on `eventType` to handle all three message operations.

#### `eventType: "new"`
**Client sends:**
```js
{
    eventType: "new",
    conversationId: <id>,
    content: "Hello",
    type: "text",          // optional, default "text"
    mediaUrl: null,        // optional
    mediaMetadata: null    // optional
}
```

**Backend flow:**
1. Validate `conversationId` and `content`
2. Find conversation, verify user is a participant
3. Determine status via `getStatus()` — `"delivered"` if recipient online, else `"sent"`
4. Create message in DB with status
5. Populate `senderId` (name, email)
6. Update conversation: `lastMessage`, `lastMessageAt`, increment `unreadCount` for other participants
7. `broadcastToConv(conversation, "new", message)` — emit to all participants

**Broadcast payload:**
```js
{
    eventType: "new",
    message: <full message object>,
    conversationId: <id>
}
```

---

#### `eventType: "edit"`
**Client sends:**
```js
{
    eventType: "edit",
    messageId: <id>,
    content: "Updated text",
    conversationId: <id>  // for context
}
```

**Backend flow:**
1. Validate `messageId`
2. Find message where `_id = messageId`, `senderId = currentUser`, `deletedAt = null`
3. Find conversation from `message.conversationId`
4. Update `content`, `editedAt = new Date()`, recalculate `status` via `getStatus()`
5. Save to DB
6. Populate `senderId`
7. `broadcastToConv(conversation, "edit", message)` — emit to all participants

**Broadcast payload:**
```js
{
    eventType: "edit",
    message: <updated message object>,
    conversationId: <id>
}
```

---

#### `eventType: "delete"`
**Client sends:**
```js
{
    eventType: "delete",
    messageId: <id>,
    conversationId: <id>  // for context
}
```

**Backend flow:**
1. Validate `messageId`
2. Find message where `_id = messageId`, `senderId = currentUser`, `deletedAt = null`
3. Set `deletedAt = new Date()`, `content = "This message was deleted"`
4. Recalculate `status` via `getStatus()`
5. Save to DB
6. Populate `senderId`
7. `broadcastToConv(conversation, "delete", message)` — emit to all participants

**Broadcast payload:**
```js
{
    eventType: "delete",
    message: <soft-deleted message object>,
    conversationId: <id>
}
```

---

### 2. `mark_read`

Read receipt event fired when a user opens a conversation.

**Client sends:**
```js
{ conversationId: <id> }
```

**Backend flow:**
1. Find all messages in conversation where `senderId != currentUser` and `status != "read"`
2. `Message.updateMany()` → set `status = "read"`
3. Find conversation, emit `messages_read` to all **other** participants

**Broadcast payload (to other participants):**
```js
{
    conversationId: <id>,
    readBy: <userId>
}
```

---

### 3. `messages_delivered` (server → client)

Fired automatically on user connect to mark previously `sent` messages as `delivered`.

**Broadcast payload:**
```js
{
    conversationId: <id>,
    deliveredTo: <userId>  // the user who just connected
}
```

**Triggered on:** user connection, when pending `sent` messages exist for that user across their conversations.

---

### 4. `message_error` (server → client)

Fired back to the originating socket when any operation fails validation or processing.

**Payload:**
```js
{ message: "<human-readable error>" }
```

---

## Client-Side Handlers (ChatScreen.jsx)

| Socket event | Handler logic |
|---|---|
| `new_message` (`eventType: "new"`) | Append to messages list if current chat; update sidebar (lastMessage, lastMessageAt); mark incoming as read |
| `new_message` (`eventType: "edit"` / `"delete"`) | Replace message in-place in messages list; no sidebar changes |
| `messages_read` | Update own messages' status to `"read"` (blue ticks) |
| `messages_delivered` | Update own messages' status to `"delivered"` (gray double-tick) |
| `message_error` | Show toast notification |

---

## Architecture Benefits

- **Single event for all CRUD operations** — `new_message` with `eventType` reduces listener count
- **Shared helpers** — `getStatus`, `broadcastToConv`, `ensureUnreadMap` eliminate duplicated logic
- **Status always accurate** — recalculated on every `new`/`edit`/`delete` based on recipient online state
- **Single source of truth** — backend emits the full message object; frontend just replaces in-place
