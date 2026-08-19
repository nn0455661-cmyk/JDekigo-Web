# Admin Panel – Requirement (Final Version v2 - UX + Status Update)

---

# 1. Overview

Admin panel manages all learning content using a **Lesson-based structure**.

All content must follow:

Level → Lesson → Content → Test

---

# 2. System Levels

- JPD113
- JPD123

---

# 3. Sidebar Navigation (UPDATED UX)

---

## Structure (IMPORTANT)

Each module must behave as a **collapsible dropdown menu**

---

### Example:

Vocabulary
→ JPD113
→ JPD123

Kanji
→ JPD113
→ JPD123

Grammar
→ JPD113
→ JPD123

Reading
→ JPD113
→ JPD123

Shadowing
→ JPD113
→ JPD123

Tests
→ JPD113
→ JPD123

---

## Behavior

- Clicking module (e.g. Vocabulary):
  → Expand dropdown
- Clicking level (e.g. JPD113):
  → Navigate to page
  → Load lesson list of that level

---

## Routing Suggestion

```bash
/admin/vocabulary/JPD113
/admin/vocabulary/JPD123
/admin/kanji/JPD113
...
```

---

# 4. Core Rule (IMPORTANT)

- No content is created outside lesson
- All content must belong to:
  - level
  - lesson

---

# 5. Lesson Management

---

## Fields

- lessonTitle
- lessonOrder
- level
- status: draft | published

---

## Behavior

- Draft:
  → not visible on client
- Published:
  → visible to users

---

# 6. Vocabulary Module

---

## Flow

Vocabulary → Level → Lesson → Content

---

## Vocabulary Fields

- word
- reading
- meaning
- example
- status: draft | published

---

## Inside Lesson

- CRUD vocabulary
- Button: Create Test

---

# 7. Kanji Module

---

## Fields

- kanji
- onyomi
- kunyomi
- meaning
- example
- drawingImage (image/gif)
- status: draft | published

---

# 8. Grammar Module

---

## Fields

- structure
- meaning
- usage
- notes
- examples (array)
- status: draft | published

---

## Exercises

### 1. Sentence Arrangement

- correctSentence
- words

### 2. Multiple Choice

- question
- options (4)
- correctAnswer

---

# 9. Reading Module

---

## Fields

- title
- content (kanji only)
- contentWithHiragana
- translation
- status: draft | published

---

# 10. Shadowing Module

---

## Fields

- youtubeVideoId
- script
- status: draft | published

---

# 11. Tests Module

---

## Types

### 1. Lesson Test

- Belongs to lesson

### 2. Practice Test

- Belongs to level only

---

## Fields

- testTitle
- level
- lessonId (optional)
- timeLimit
- status: draft | published

---

## Question Fields

- type (multiple_choice | arrangement | listening)
- question
- options
- correctAnswer
- reading (hiragana for kanji)
- explanation (optional)

---

## Special Feature

- Toggle Furigana ON/OFF

---

# 12. UI Requirements

---

## Sidebar

- Collapsible dropdown menu
- Active state highlight
- Smooth animation

---

## Lesson List Page

- Table:
  - lessonTitle
  - order
  - status

- Actions:
  - Edit
  - Delete
  - Enter Lesson

---

## Lesson Detail Page

Tabs:

- Content
- Tests

---

## Status UI

- Dropdown or toggle:
  - Draft
  - Published

---

## Form

- Input
- Textarea
- Select
- Upload (image/gif)

---

## Table

- Pagination
- Search
- Filter by:
  - level
  - status

---

# 13. Data Relationships

- Level → Lessons
- Lesson → Content
- Lesson → Tests
- Test → Questions

---

# 14. Data Flow

Admin creates:
Level → Lesson → Content → Publish

Client:
Fetch only "published" data

---

# 15. Important Rules

- Draft content must NOT appear on client
- Only published data is visible

---

# FINAL GOAL

A scalable CMS where:

- Admin controls all content
- Content is structured by lesson
- UI is clean and intuitive
- Ready for production deployment
