# Đề xuất smoke test provider thật cho từ vựng AI

Trạng thái: **chỉ đề xuất, chưa chạy, không nằm trong lệnh mặc định**. Tài liệu
này không cấp quyền gọi provider; mọi lần chạy thật cần người dùng xác nhận
riêng và kiểm tra chi phí trước.

## 1. Mục tiêu và giới hạn

- Gọi provider thật một lần cho một chủ đề ngắn để kiểm tra prompt `vocab.v1`,
  JSON envelope, IPv4/IPv6, CEFR và khả năng trả đủ từ.
- Không ghi DB, không dùng tài khoản thật, không đọc/ghi `.env`.
- Không sửa `backend/app/llm/` và không thêm dependency.
- Không chạy trong CI, Makefile, `scripts/manage.py` hay bất kỳ lệnh mặc định.
- Không in chủ đề, prompt, API key, token hay nội dung provider thô.

## 2. Script đề xuất

Đường dẫn đề xuất: `scripts/smoke_vocabulary_generation.py`.

Cờ bắt buộc và an toàn:

```text
--confirm-real-provider       Bắt buộc; thiếu cờ thì in kế hoạch rồi exit 2.
--target-count {30,60}        Mặc định 30.
--max-calls N                 Mặc định 10 cho 30 từ, 20 cho 60 từ; không vượt trần.
--topic TEXT                  Chỉ nhận 2-80 ký tự; không in lại giá trị.
--level {A1,A2,B1,B2,C1,C2}   Mặc định A2.
```

Luồng đề xuất:

1. Từ chối nếu thiếu `--confirm-real-provider` hoặc provider là `mock`.
2. Đọc `Settings`; từ chối nếu cap output của provider đang chọn > 2048.
3. Khởi tạo `GeminiLLMClient` hoặc `OpenAILLMClient` trực tiếp, không qua DB.
4. Giữ tối đa `--max-calls`; trước mỗi lời gọi kiểm tra bộ đếm và dừng ngay
   khi chạm trần.
5. Gửi prompt hệ thống `vocab.v1` và message JSON có phân cách
   (`{"task": ..., "topic": ..., "batch_size": ...}`), giống service.
6. Parse bằng `parse_batch`, validate từng từ như `Word`; chỉ cộng từ hợp lệ,
   bỏ từ trùng.
7. Chỉ in số lời gọi, số từ hợp lệ, mã trạng thái an toàn và thời gian chạy.
8. Dừng khi đủ target, gặp 429/502/timeout, hết trần lời gọi hoặc quá deadline.

Khung mã tham khảo (chưa thêm vào repo):

```python
"""Opt-in, no-database provider smoke test; never run by default."""
import argparse
import asyncio
import json

from app.core.config import get_settings
from app.core.prompts import read_prompt
from app.llm.gemini import GeminiLLMClient
from app.llm.openai import OpenAILLMClient
from app.schemas.vocabulary import Word
from app.services.vocabulary_generation import (
    PROMPT_PATH,
    PROMPT_VERSION,
    parse_batch,
    word_id,
)


async def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--confirm-real-provider", action="store_true")
    parser.add_argument("--target-count", type=int, choices=(30, 60), default=30)
    parser.add_argument("--max-calls", type=int)
    parser.add_argument("--topic", default="small daily routines")
    parser.add_argument("--level", default="A2")
    args = parser.parse_args()
    if not args.confirm_real_provider:
        print("Refusing: pass --confirm-real-provider after approving cost.")
        return 2

    settings = get_settings()
    if settings.llm_provider == "mock":
        print("Refusing: mock provider is not a real smoke test.")
        return 2
    cap = (
        settings.openai_max_output_tokens
        if settings.llm_provider == "openai"
        else settings.gemini_max_output_tokens
    )
    if cap > 2048:
        print("Refusing: output cap exceeds the vocabulary guard.")
        return 2

    ceiling = 2 * ((args.target_count + settings.vocabulary_batch_size - 1)
                   // settings.vocabulary_batch_size)
    max_calls = min(args.max_calls or ceiling, ceiling)
    client = (
        GeminiLLMClient(settings)
        if settings.llm_provider == "gemini"
        else OpenAILLMClient(settings)
    )
    accepted: set[str] = set()
    used_ids: set[str] = set()
    calls = 0
    try:
        while len(accepted) < args.target_count and calls < max_calls:
            calls += 1
            message = json.dumps(
                {
                    "task": "generate_vocabulary_batch",
                    "topic": args.topic,
                    "target_count": args.target_count,
                    "batch_size": min(
                        settings.vocabulary_batch_size,
                        args.target_count - len(accepted),
                    ),
                    "cefr_level": args.level,
                    "accepted_terms": sorted(accepted),
                },
                ensure_ascii=False,
            )
            raw = await client.generate(
                message, args.level, read_prompt(PROMPT_PATH), history=None
            )
            batch = parse_batch(raw)
            if batch.status != "ok" or batch.topic is None:
                print(f"Stopped safely: status={batch.status} calls={calls}")
                return 1
            for item in batch.words:
                normalized = " ".join(item.term.casefold().split())
                if normalized in accepted:
                    continue
                candidate = word_id(item.term, used_ids)
                try:
                    Word.model_validate({**item.model_dump(), "id": candidate})
                except Exception:
                    continue
                accepted.add(normalized)
    except Exception as exc:
        print(f"Stopped safely: {type(exc).__name__} calls={calls}")
        return 1
    print(
        f"provider={settings.llm_provider} prompt={PROMPT_VERSION} "
        f"calls={calls} words={len(accepted)} target={args.target_count}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
```

Khung trên chỉ là đề xuất; nếu duyệt mới thêm file và chạy tay với
`--confirm-real-provider`. Script không được gọi từ test, CI, Docker hay
`make`.

## 3. Trần lời gọi và token đầu ra

Với batch mặc định 6 từ/lời gọi và ngân sách worst-case
`2 × ceil(target / batch_size)`:

| Target | Batch | Lời gọi tối đa | Token đầu ra tối đa mỗi lời gọi | Token đầu ra tối đa/job |
| --- | --- | ---: | ---: | ---: |
| 30 từ | 6 | **10** | 2.048 | **20.480** |
| 60 từ | 6 | **20** | 2.048 | **40.960** |

- Con số trên là **trần output** theo guard 2.048 token; đây là phần tính được
  chắc chắn từ cấu hình hiện tại.
- Nếu provider là OpenAI với mặc định `OPENAI_MAX_OUTPUT_TOKENS=800`, trần
  tương ứng là 8.000 và 16.000 token output; nếu cấu hình tới 2.048 thì dùng
  bảng trên.
- Token đầu vào chưa có trần trong `LLMClient.generate`; script chỉ có thể đếm
  ký tự prompt, không được tự nhận là số token chính xác. Muốn đo chính xác
  cần provider trả usage hoặc thay interface `app/llm/`, cả hai đều ngoài phạm
  vi được duyệt.
- Chi phí thực tế thường thấp hơn vì job không lỗi chỉ dùng 5 lời gọi (30 từ)
  hoặc 10 lời gọi (60 từ); trần trên dành cho trường hợp repair tối đa.
- Job còn có deadline 360 giây (30 từ) và 660 giây (60 từ); script phải dừng
  theo cả hai giới hạn.
