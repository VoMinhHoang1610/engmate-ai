# EngMate — giao diện voice-first

> Cập nhật 18/10/2026: thiết kế “Mate lắng nghe” thay orb cũ bằng tạo hình robot riêng, đồng bộ sang workspace thật, dùng vàng dịu cho hoàn thành và lộ trình trạm thẳng. Xem [nguyên tắc và kiểm chứng](MATE_LISTENS.md); phần mô tả hình thức bên dưới là ghi nhận của bản trước.

Trang đăng nhập gốc với các nút Google/GitHub/Facebook được khôi phục làm mặc định ở `/`. Bản giao diện voice-first chạy riêng tại `/?mode=preview` với dữ liệu mock, không cần backend, đăng nhập hay quyền micro. Đây là bản thiết kế tương tác: hội thoại, bản ghi và điểm số là minh họa. Nút **Nghe mẫu** ở màn phát âm dùng speech synthesis của trình duyệt nếu thiết bị hỗ trợ.

## Chạy local

Yêu cầu Node.js >= 22.12. Từ thư mục dự án:

```powershell
cd frontend
npm ci
npm run dev
```

Mở <http://127.0.0.1:5174/> để đăng nhập vào ứng dụng hiện có. Bản thiết kế mock nằm tại <http://127.0.0.1:5174/?mode=preview>. Đường dẫn cũ `?mode=live` vẫn hoạt động. Trang giới thiệu vẫn mở qua `#trang-chu`.

```powershell
npm run build
npm test -- src/voice-first/VoiceFirstApp.test.tsx
```

## Các màn hình

Các hash dưới đây áp dụng trong `?mode=preview`.

| URL              | Nội dung                                                  |
| ---------------- | --------------------------------------------------------- |
| `#noi-cung-mate` | Orb Mate, micro 80px, ba gợi ý, chat thu gọn              |
| `#kham-pha`      | Ba chủ đề trò chuyện                                      |
| `#lo-trinh`      | 100 bài chia năm cấp độ, node ba trạng thái, bottom sheet |
| `#phat-am`       | Nghe mẫu, ghi âm mô phỏng, điểm và gợi ý từng từ          |
| `#tien-do`       | Streak, phút học, vòng tiến độ, biểu đồ bảy ngày          |
| `#cai-dat`       | Chọn giao diện sáng/tối                                   |

Micro mở dialog toàn màn hình. Trạng thái tự chuyển **Rảnh → Đang nói → Đang nghe → Đang nghĩ**; tắt mic và tạm dừng sẽ dừng timer. Escape hoặc **Thoát** đóng phiên và trả focus về vị trí mở. Các trạng thái không sử dụng âm thanh đầu vào thật.

## File tạo mới

- `frontend/src/voice-first/VoiceFirstApp.tsx`: layout, điều hướng, màn chính, chat mock, theme và cài đặt.
- `frontend/src/voice-first/SidebarNav.tsx`: `SidebarNav`, `BottomTabBar` và tooltip.
- `frontend/src/voice-first/components.tsx`: `Orb`, `VoiceButton`, `ChipSuggestion`, `ChatInput`, `ScoreRing`, `Sheet`, `IconButton`.
- `frontend/src/voice-first/VoiceSession.tsx`: dialog thoại và phụ đề tương tác.
- `frontend/src/voice-first/useMockVoice.ts`: state và timer mô phỏng hội thoại.
- `frontend/src/voice-first/LearningViews.tsx`: `RoadmapView`, `LessonNode`, `PronunciationView`, `ProgressView`, `StreakCard`, `ExploreView`.
- `frontend/src/voice-first/voice-first.css`: design tokens, layout, component, orb, theme và responsive.
- `frontend/src/voice-first/voice-session.css`: màn thoại.
- `frontend/src/voice-first/learning-views.css`: các màn học.
- `frontend/src/voice-first/LiveApp.tsx`: tải ứng dụng hiện có theo yêu cầu.
- `frontend/src/voice-first/VoiceFirstApp.test.tsx`: kiểm tra tương tác giao diện mới.

File đã sửa: `frontend/src/main.tsx` (entry mặc định và chế độ live), `frontend/index.html` (font Inter hỗ trợ tiếng Việt), `frontend/package.json` và `frontend/package-lock.json` (Motion, Lucide, Radix và tiện ích class).

## Theme và khả năng tiếp cận

Token nằm trong `:root` và `[data-theme='dark']`, tiền tố `--mate-`. Chỉ dùng indigo, xanh lá thành công và cam chú ý trên nền trung tính. `--mate-on-accent` đảm bảo màu chữ nút chính phù hợp từng theme. Giao diện lưu lựa chọn ở `engmate-theme`.

Sidebar 88px chuyển thành năm bottom tab ở <= 640px. Nút có vùng chạm ít nhất 44px; dialog dùng Radix với focus trap, nhãn và Escape. Có skip link, focus ring và `lang="en"` cho nội dung học. `MotionConfig reducedMotion="user"` cùng media query loại bỏ chuyển động khi hệ thống yêu cầu giảm animation.

## Điểm nối dữ liệu sau này

- Thay `useMockVoice` bằng adapter giọng nói, giữ bốn state, transcript và hành động pause/mute.
- Truyền nội dung bài qua `onStartLesson(title)` và `onStartTopic(title)`; `VoiceSession` nhận `topic`, `open`, `onClose`.
- `ChatInput` chỉ phát `onSend(text)`, chưa gọi API.
- Dữ liệu bài học, cụm phát âm và thống kê đang đặt trong `LearningViews.tsx`; thay bằng dữ liệu/hook khi bắt đầu tích hợp.

## Kết quả kiểm tra

- TypeScript và production build thành công. Hai giao diện được tải riêng theo URL; build hiện không còn cảnh báo chunk trên 500 kB.
- ESLint cho các file mới và entry, cùng Prettier check, đều qua.
- Năm test mới qua: 100 bài học, hội thoại/focus, phát âm, chat/theme và vòng đời timer.
- Chrome kiểm tra 320, 390, 900 và 1440px: không tràn ngang, nút tối thiểu 44px; không có yêu cầu API/micro ở bản mock. Có kiểm tra giảm chuyển động và khôi phục focus từ bottom sheet sang thoại rồi thoát.
- Sau khi khôi phục trang đăng nhập gốc, 49/49 test trong `App.test.tsx` và `AuthForm.test.tsx` đều qua. Các nút chuyển chế độ tài khoản trong panel Mate đã được đưa lại, không sửa selector test.

Đợt khôi phục sửa `frontend/src/main.tsx`, `frontend/src/App.tsx`, `frontend/src/AuthForm.tsx` và bổ sung `frontend/src/auth-restored.css`: đăng nhập là màn mặc định, giữ panel Mate và các nút Google/GitHub/Facebook. OAuth của các nhà cung cấp vẫn giữ trạng thái chưa cấu hình; đăng nhập tài khoản/mật khẩu tiếp tục dùng API hiện có.

Ảnh và báo cáo QA cuối nằm trong `.artifacts/voice-first-*.png` và `.artifacts/voice-first-final.json`.

## Tham khảo

Định hướng trải nghiệm từ [Speak](https://www.speak.com/), [Duolingo](https://www.duolingo.com/) và [Linear](https://linear.app/). Triển khai dựa trên tài liệu chính thức của [Motion](https://motion.dev/docs/react-accessibility), [Radix Dialog](https://www.radix-ui.com/primitives/docs/components/dialog), [shadcn/ui](https://ui.shadcn.com/docs/components/dialog), [Tailwind](https://tailwindcss.com/docs/theme) và [Lucide](https://lucide.dev/guide/react).
