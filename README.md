# 🇯🇵 J-Deki-Go (Web Learn Japan)

J-Deki-Go là một nền tảng web ứng dụng học tiếng Nhật toàn diện, hỗ trợ người dùng tự học, rèn luyện các kỹ năng tiếng Nhật và ôn thi chứng chỉ JLPT. Dự án được xây dựng với các công nghệ hiện đại, mang lại trải nghiệm học tập mượt mà và trực quan.

## 🚀 Công nghệ sử dụng (Tech Stack)

### Frontend
- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **Library:** [React 18](https://react.dev/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Japanese Text Utility:** [Wanakana](https://wanakana.com/) (Hỗ trợ chuyển đổi Romaji, Hiragana, Katakana)

### Backend & Database
- **API:** Next.js API Routes
- **Database:** MongoDB
- **ORM/ODM:** [Mongoose](https://mongoosejs.com/)
- **Cloud Storage:** [Cloudflare R2](https://developers.cloudflare.com/r2/) qua S3-compatible API (lưu trữ hình ảnh, audio và video)

### Authentication & Security
- **Auth:** Custom authentication với JWT (`jsonwebtoken`)
- **Password Hashing:** `bcryptjs`
- **Validation:** `zod`

## 🌟 Tính năng chính (Features)

### 1. Hệ thống nội dung học tiếng Nhật

Nội dung được tổ chức theo từng cấp độ và bài học, giúp người học đi từ kiến thức nền tảng đến luyện tập và kiểm tra trong cùng một luồng:

- **Từ vựng (Vocabulary):** Hiển thị từ, cách đọc, nghĩa, hình ảnh/GIF và câu ví dụ. Người học có thể học theo bài, luyện bằng flashcard, ôn lại kiến thức và làm bài kiểm tra riêng của từng cấp độ.
- **Hán tự (Kanji):** Cung cấp mặt chữ, âm On, âm Kun, âm Hán Việt, ý nghĩa, ví dụ, ảnh nét viết và ảnh minh họa. Module có trang chi tiết, chế độ flashcard, bài kiểm tra và lịch sử kết quả.
- **Ngữ pháp (Grammar):** Trình bày cấu trúc, ý nghĩa, cách dùng, ghi chú, mẹo ghi nhớ và ví dụ/hội thoại. Mỗi bài có thể gồm nhiều mục ngữ pháp, kèm phần luyện tập, bài kiểm tra và trang xem lại lịch sử.
- **Đọc hiểu (Reading):** Bài đọc hỗ trợ nội dung tiếng Nhật, cách đọc, Romaji và bản dịch. Người học có thể mở từng bài, luyện flashcard, làm câu hỏi đọc hiểu và xem lại kết quả đã làm.
- **Luyện nói (Speaking):** Nội dung luyện nói được chia theo cấp độ và bộ bài, kết hợp hình ảnh, audio và script để người học nghe, đọc theo và luyện phản xạ. Ngoài bài hội thoại còn có khu vực luyện đọc thành tiếng.
- **Shadowing:** Cung cấp nội dung nghe và lặp lại theo cấp độ, giúp luyện phát âm, nhịp điệu và ngữ điệu thông qua video hoặc tài liệu được quản trị viên biên soạn.
- **Video bài giảng:** Tổng hợp video YouTube theo cấp độ để người học xem bài giảng trực tiếp trong hệ thống mà không phải tìm kiếm rời rạc.
- **Hiển thị tiếng Nhật dễ đọc:** Các thành phần nội dung hỗ trợ Furigana/Ruby và cách trình bày câu tiếng Nhật, hội thoại, ví dụ phù hợp với dữ liệu học tập.

### 2. Luyện tập, kiểm tra và thi thử

- **Mini Practice theo bài học:** Mỗi bài học có thể gắn bài luyện tập ngắn để kiểm tra ngay phần kiến thức vừa học.
- **Đề thi theo module và cấp độ:** Hệ thống hỗ trợ đề tổng hợp, đề thi thử đầy đủ và các nhóm mini test được sắp xếp theo thứ tự.
- **Nhiều dạng câu hỏi:** Bao gồm trắc nghiệm, điền đáp án, sắp xếp câu, nghe hiểu và đọc hiểu; câu hỏi có thể kèm đoạn văn, audio, đáp án và phần giải thích.
- **Trải nghiệm làm bài hoàn chỉnh:** Có đồng hồ đếm ngược, tự nộp khi hết giờ, chuyển nhanh giữa các câu, đánh dấu câu cần xem lại và thống kê số câu đã trả lời trước khi nộp.
- **Không mất bài đang làm:** Đáp án, câu đang đứng, câu đã đánh dấu và thời gian kết thúc được lưu trên trình duyệt để có thể khôi phục khi tải lại trang.
- **Chấm điểm và giải thích:** Sau khi nộp, hệ thống tính số câu đúng, tổng số câu, tỷ lệ phần trăm và cho phép xem lại đáp án cùng giải thích chi tiết.
- **Lịch sử học tập:** Lưu kết quả, thời gian làm bài, câu hỏi và đáp án của từng lần thi. Người dùng có thể mở lịch sử theo từng module để xem lại; hệ thống có cơ chế lưu cục bộ dự phòng khi chưa thể đồng bộ máy chủ.

### 3. Study Set — Bộ học tập cá nhân

- Người dùng đã đăng nhập có thể tạo nhiều bộ học tập riêng và quản lý các thẻ thuộc từng bộ.
- Mỗi thẻ hỗ trợ từ/cụm từ, cách đọc, âm Hán Việt, nghĩa, ghi chú, câu ví dụ và nghĩa của ví dụ.
- Có thể thêm, sửa, xóa từng thẻ hoặc nhập hàng loạt bằng JSON để tiết kiệm thời gian chuẩn bị dữ liệu.
- Hỗ trợ ba cách học: **Flashcard** để ghi nhớ, **Quiz** để chọn đáp án và **Recall** để chủ động nhớ lại kiến thức.
- Dữ liệu Study Set gắn với tài khoản người tạo, tránh trộn lẫn bộ học tập giữa các người dùng.

### 4. Tài khoản, cá nhân hóa và trải nghiệm giao diện

- **Xác thực tài khoản:** Đăng ký, đăng nhập, làm mới phiên và đăng xuất bằng JWT; mật khẩu được băm trước khi lưu và refresh token được đặt trong cookie `httpOnly`.
- **Bảo vệ đăng nhập:** API xác thực có giới hạn tần suất để giảm nguy cơ dò mật khẩu; quyền `user` và `admin` được kiểm tra ở cả giao diện lẫn API.
- **Hồ sơ cá nhân:** Cho phép cập nhật tên, ảnh đại diện, số điện thoại, giới tính và xem ngày tham gia; email được dùng làm định danh tài khoản.
- **Đổi mật khẩu:** Người dùng có thể đổi mật khẩu bằng cách xác nhận mật khẩu hiện tại và mật khẩu mới.
- **Đa ngôn ngữ:** Giao diện hỗ trợ tiếng Việt, tiếng Anh và tiếng Nhật; lựa chọn được ghi nhớ trên trình duyệt.
- **Sáng/tối và responsive:** Có giao diện Light/Dark, thanh điều hướng phù hợp cho máy tính lẫn điện thoại và lưu lại tùy chọn của người dùng.
- **Điều hướng nhanh:** Dữ liệu và trang thường dùng được prefetch, trạng thái tải và hiệu ứng chuyển trang được tối ưu để giảm cảm giác chờ khi di chuyển giữa các module.

### 5. Trang quản trị nội dung (Admin Dashboard)

- **Quản lý bài học:** Tạo, xem, chỉnh sửa và xóa bài học theo module/cấp độ; quản lý thứ tự và các mục nội dung nằm trong từng bài.
- **Quản lý nội dung chuyên biệt:** Có màn hình riêng cho Từ vựng, Kanji, Ngữ pháp, Đọc hiểu, Speaking, Shadowing và Video với đúng trường dữ liệu của từng loại.
- **Ngân hàng câu hỏi:** Quản trị viên có thể tạo và chỉnh sửa câu hỏi theo module, cấp độ, loại câu hỏi và trạng thái `draft`/`published`.
- **Quản lý đề thi:** Tạo mini practice, nhóm mini test và đề thi đầy đủ; cấu hình thời gian, phạm vi, số lượng/phân bố câu hỏi trước khi xuất bản.
- **Quản lý người dùng:** Xem danh sách tài khoản, thông tin hoạt động và thay đổi vai trò người dùng khi cần.
- **Thống kê học tập:** Dashboard tổng hợp số người dùng, số lượt làm bài và kết quả; có trang chi tiết để xem lịch sử học tập của từng người dùng.
- **Phân quyền:** Toàn bộ trang và API quản trị yêu cầu quyền admin, hạn chế người dùng thông thường truy cập hoặc chỉnh sửa dữ liệu.

### 6. Quản lý hình ảnh, audio và video trên Cloudflare R2

- Ảnh chỉ được preview tại trình duyệt khi chọn file và chỉ bắt đầu upload khi quản trị viên bấm lưu, tránh tạo file rác do đổi hoặc hủy ảnh.
- Ảnh tải lên được giới hạn dung lượng, resize tối đa 1920px, chuyển sang WebP và đặt tên theo SHA-256 để giảm kích thước cũng như tránh lưu trùng nội dung.
- Audio ưu tiên upload trực tiếp từ trình duyệt lên R2 bằng presigned URL; nếu CORS không cho phép, giao diện tự chuyển sang upload qua API server.
- Media mới đi qua vùng `temp`, sau đó được chuyển sang key cố định trong `uploads` khi người dùng lưu nội dung. MongoDB chỉ nhận URL chính thức; nếu quá trình lưu thất bại, hệ thống rollback media không còn được tham chiếu và dọn file tạm để tránh dữ liệu mồ côi.
- File tạm quá 24 giờ được ứng dụng định kỳ kiểm tra và xóa; có thêm script kiểm kê R2 ở chế độ dry-run để phát hiện object không còn được MongoDB tham chiếu.
- Khi thay ảnh hoặc xóa bài học/nội dung/đề thi, hệ thống kiểm tra toàn bộ tham chiếu trong MongoDB và chỉ xóa object R2 khi không còn bản ghi nào khác sử dụng, tránh làm hỏng media dùng chung.
- Media chính thức được đặt cache dài hạn để giảm số lượt đọc R2, tiết kiệm quota Cloudflare Free và tăng tốc tải nội dung trên môi trường production.

## 📂 Cấu trúc thư mục (Folder Structure)

```text
├── app/                  # Chứa các pages, layouts, routing (Next.js App Router)
│   ├── admin/            # Trang quản trị (Dashboard, Quản lý dữ liệu)
│   ├── api/              # Backend API Routes
│   ├── grammar/          # Trang học ngữ pháp
│   ├── kanji/            # Trang học Kanji
│   ├── vocabulary/       # Trang học từ vựng
│   ├── mock-test/        # Trang thi thử JLPT
│   ├── reading/          # Trang luyện đọc hiểu
│   ├── speaking/         # Trang luyện nói
│   ├── shadowing/        # Trang luyện Shadowing
│   ├── study-set/        # Trang học theo bộ từ vựng
│   └── ...               # (Auth: login, register, profile, video...)
├── components/           # Chứa các UI components dùng chung (Buttons, Cards, Navbar...)
│   ├── admin/            # Components riêng cho Admin
│   ├── auth/             # Components cho xác thực
│   ├── feature/          # Components tính năng đặc thù (VD: MockTestExamRunner...)
│   ├── layout/           # Layout components
│   └── providers/        # Context Providers
├── server/               # Logic backend & Database
│   ├── models/           # Mongoose schemas (user, grammar, kanji, test, question...)
│   ├── lib/              # Database connection & configurations
│   ├── middlewares/      # API middlewares (Auth check...)
│   ├── modules/          # Core logic & Controllers cho API
│   └── utils/            # Helper functions cho backend
├── public/               # Tài nguyên tĩnh (Images, icons...)
├── scripts/              # Các script hỗ trợ (VD: Chạy dev server với port cố định)
└── ...                   # (Các file config: package.json, tailwind.config.js, next.config.js...)
```

## 🛠 Hướng dẫn cài đặt & Chạy dự án (Installation & Setup)

**1. Clone dự án**
```bash
git clone <repository_url>
cd Web-Learn-Japan
```

**2. Cài đặt thư viện**
```bash
npm install
```

**3. Cấu hình biến môi trường**
Tạo file `.env.local` ở thư mục gốc (tham khảo file `.env.example`) và điền các thông tin:
```env
MONGODB_URI=your_mongodb_connection_string
JWT_ACCESS_SECRET=your_access_token_secret
JWT_REFRESH_SECRET=your_refresh_token_secret

R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=your_r2_bucket_name
R2_PUBLIC_BASE_URL=https://your-public-r2-domain.example.com
```

Khi deploy Vercel, dùng `.env.production.example` làm danh sách biến cần khai báo. Các biến restore/chuyển tài khoản chỉ nằm trong `.env.handover.example` và không được đưa lên Vercel.

Không commit `.env`, `.env.local` hoặc credential R2. Khi deploy, phải khai báo cùng các biến `R2_*` trên hosting rồi redeploy để `next/image` và API upload nhận đúng public hostname.

**4. Chạy dự án ở chế độ phát triển (Development)**
```bash
npm run dev
# Chỉ dùng khi cần xóa cache Next.js rồi chạy lại từ đầu
npm run dev:clean
```
`npm run dev` dùng Turbopack và giữ cache `.next`, nhờ đó các lần khởi động và chuyển trang tiếp theo nhanh hơn.
*Truy cập ứng dụng tại địa chỉ: `http://localhost:3000` (hoặc cổng được cấu hình trong scripts)*

**5. Build dự án (Production)**
```bash
npm run build
npm run start
```
---
*Được phát triển với mục tiêu mang tiếng Nhật đến gần hơn với mọi người.* 🎌
