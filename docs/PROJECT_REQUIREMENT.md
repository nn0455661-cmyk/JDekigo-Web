# Project Requirement

## 1. Project Goal

Xây dựng nền tảng học tiếng Nhật có kiến trúc rõ ràng, dễ maintain và đủ khả năng scale cho production sau này.  
Codebase hiện tại chạy trên Next.js App Router, có backend module nội bộ và frontend service layer riêng.

## 2. Supported Scope

### 2.1 User Scope

- Đăng ký/đăng nhập/đăng xuất/refresh phiên.
- Cập nhật profile và đổi mật khẩu.
- Học theo level và theo module.
- Làm flashcard, practice, test, xem lịch sử.
- Tạo và quản lý study set cá nhân.

### 2.2 Supported Levels

- `JPD113` (default)
- `JPD123`
- Có normalize từ legacy level (`N5`, `N4`, `N3`, `N2`, `N1`).

### 2.3 Main Learning Flow

`Level -> Lesson/Topic -> Content -> Practice/Test -> History`

## 3. Mandatory Project Structure

```text
app/                     # Next.js App Router pages + API routes
components/              # UI components and feature panels
docs/                    # Architecture and AI operation docs
public/                  # Static assets
server/                  # Backend business modules and data access
src/
  lib/                   # Shared infra (axios client)
  services/              # Frontend API service layer
  shared/
    constants/           # Cross-layer constants
    hooks/               # Reusable hooks
    mock/                # Mock datasets
    utils/               # Shared utility functions
```

## 4. Architecture Constraints (Strict)

### 4.1 Frontend Calling Rules

- `app/**` and `components/**` **must not** call `fetch('/api/...')` directly.
- API calls **must** go through `src/services/**`.
- Services **must** use `src/lib/axios.js` as single HTTP client.

### 4.2 API Route Rules

- `app/api/**/route.js` is adapter only.
- Business logic belongs in `server/modules/**`.
- API routes should delegate to controller functions and keep files thin.

### 4.3 Backend Layer Rules

- Follow pipeline: `controller -> validation -> service -> repository -> model/db`.
- Do not mix repository logic in controller.
- Keep reusable helpers in `server/lib` and `server/utils`.

## 5. Module Requirements

### 5.1 Vocabulary

- Học theo level/topic/lesson.
- Flashcard theo toàn level hoặc theo selected lessons.
- Test hỗ trợ nhiều mode (mix/fast/reverse/lesson scope).
- History lưu được snapshot kết quả.

### 5.2 Kanji

- Học theo level.
- Chia lesson theo nhóm cố định (hiện tại 10 chữ/bài).
- Có flashcard + test + history.

### 5.3 Grammar

- Học theo level.
- Chia lesson (hiện tại 5 grammar item/bài ở list lesson).
- Có practice/test/history.
- Practice/Test phải lưu snapshot để review ổn định.

### 5.4 Reading

- Học theo level và bài đọc.
- Có typing/practice/test/history theo level.
- Test flatten từ question pools của reading passages.

### 5.5 Mock Test

- Có test templates theo level.
- Có timer, submit flow, review modal và history.

### 5.6 Study Set

- CRUD study set cá nhân.
- CRUD card, bulk import, dictionary suggest.
- Flashcard session độc lập với module nội dung chuẩn.

## 6. Data and History Rules

- Dữ liệu nội dung phải có `level` hợp lệ sau normalize.
- Mọi lần submit test/practice cần lưu đủ metadata:
  - `questions`
  - `answers`
  - `correct`
  - `total`
  - `percentage`
  - `durationSeconds`
  - `createdAt`
- History hiển thị theo `module + level + user`.

## 7. Authentication and Session Rules

- Access token lưu client-side theo key chuẩn của app.
- Refresh token dùng secure cookie flow.
- Frontend xử lý refresh session tập trung ở provider/service, không copy logic vào từng page.

## 8. Non-functional Requirements

- Responsive cho mobile/tablet/desktop.
- UI nhất quán theo design system hiện tại.
- Không làm hỏng flow khi lỗi API: phải có fallback message rõ ràng.
- Mọi thay đổi kiến trúc phải cập nhật docs cùng lúc.

## 9. Definition of Done for New Features

- Đúng thư mục/layer theo mục 3 và 4.
- Có service function cho API mới.
- Không có API call trực tiếp trong page/component.
- API route mỏng, logic nằm ở server module.
- Có cập nhật docs nếu đổi cấu trúc/quy ước.
