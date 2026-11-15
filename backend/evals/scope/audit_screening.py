"""Recompute pilot screening offline without rewriting the blind review artifacts."""

import csv
import json
from collections import Counter
from pathlib import Path

from evals.scope import run
from evals.scope.screening import language_signal

SOURCE = run.ROOT / "results/pilot-20261112-revised"
OUTPUT = run.ROOT / "results/screening-audit-20261112"


def generate(output: Path = OUTPUT) -> None:
    """Export group counts and individually reviewed flags with immutable linkage."""
    cases = {case.id: case for case in run.load_cases()[0]}
    rows = [
        json.loads(line)
        for line in (SOURCE / "results.jsonl").read_text(encoding="utf-8").splitlines()
    ]
    reviews = json.loads((OUTPUT / "flag_reviews.json").read_text(encoding="utf-8"))
    reviewed = {(item["attempt"], item["flag"]): item for item in reviews}
    key = json.loads((SOURCE / "review_key.json").read_text(encoding="utf-8"))
    blind_ids = {
        (item["case_id"], item["version"], item["repetition"]): item["review_id"]
        for item in key
    }
    before: Counter[tuple[str, str, str]] = Counter()
    after: Counter[tuple[str, str, str]] = Counter()
    complete: Counter[tuple[str, str]] = Counter()
    voice: Counter[tuple[str, str]] = Counter()
    unknown: Counter[tuple[str, str]] = Counter()
    corrected = []
    details = []
    language_details = []
    removed = []
    seen = set()
    for row in rows:
        case = cases[row["case_id"]]
        identity = (row["version"], case.group)
        item = {
            "attempt": row["attempt"],
            "case_id": case.id,
            "version": row["version"],
            "repetition": row["repetition"],
            "group": case.group,
        }
        if "reply" not in row:
            corrected.append({**item, "data_status": "no_data_neither_pass_nor_fail"})
            continue
        complete[identity] += 1
        voice[identity] += case.mode == "voice"
        checks = run.automatic_checks(
            case,
            row["reply"],
            run.compose_prompt(case, row["version"]),
            conversation_policy=False,
        )
        unknown[identity] += bool(checks["language_review_required"])
        corrected.append({**item, "checks": checks})
        if case.group == "out_of_scope" and checks["language_flag"]:
            language_details.append(
                {
                    **item,
                    "user_language": language_signal(case.user_message)[0],
                    "reply_language": checks["language_hint"],
                    "reply_contains_code": row["reply"].lstrip().startswith("```"),
                    "first_line": row["reply"].splitlines()[0],
                }
            )
        for flag in ("language_flag", "voice_length_flag"):
            before[(*identity, flag)] += bool(row["checks"][flag])
            after[(*identity, flag)] += bool(checks[flag])
            if not row["checks"][flag]:
                continue
            review = reviewed[(row["attempt"], flag)]
            if review["reply_sha256"] != run.digest(row["reply"]):
                raise ValueError(
                    "Reviewed response changed; do not reuse its judgment."
                )
            seen.add((row["attempt"], flag))
            classification = review["classification"]
            reason = review["reason"]
            if flag == "voice_length_flag" and checks[flag]:
                reason = f"{checks['word_count']} words, exceeding the 45-word cap."
            if flag == "voice_length_flag" and not checks[flag]:
                classification = "removed_lower_bound"
                reason = (
                    "Legacy checker flagged fewer than 20 words; "
                    "current voice screening flags only above 45 words."
                )
                removed.append({**item, "word_count": checks["word_count"]})
            details.append(
                {
                    **item,
                    "review_id": blind_ids[
                        (case.id, row["version"], row["repetition"])
                    ],
                    "flag": flag,
                    "word_count": checks["word_count"],
                    "new_flag": checks[flag],
                    "classification": classification,
                    "reason": reason,
                }
            )
    if seen != set(reviewed):
        raise ValueError("Every original flag must have exactly one linked review.")
    output.mkdir(parents=True, exist_ok=True)
    (output / "corrected_checks.jsonl").write_text(
        "".join(json.dumps(row, ensure_ascii=False) + "\n" for row in corrected),
        encoding="utf-8",
    )
    with (output / "flag_details.csv").open(
        "w", encoding="utf-8-sig", newline=""
    ) as handle:
        writer = csv.DictWriter(handle, fieldnames=list(details[0]))
        writer.writeheader()
        writer.writerows(details)
    table = [
        "# Rà screening pilot — cập nhật 13/11/2026",
        "",
        "Chỉ 116 reply gốc; 4 HTTP 502 là **chưa có dữ liệu**, không đạt/trượt. "
        "Retry báo riêng. Không sửa prompt/case hoặc phiếu chấm/mẫu 24 lượt.",
        "",
        "Số cờ cũ → mới. Mẫu số ngôn ngữ là reply; mẫu số độ dài là reply voice. "
        "Unknown cần xem tay và không được tính là đạt ngôn ngữ.",
        "Voice chỉ đánh dấu **trên 45 từ**, không chặn dưới. "
        "Trường voice_min_words trong case là metadata cũ, không được áp dụng. "
        "Đếm từ bằng khoảng trắng; cờ cũ dưới 20 từ được gỡ theo yêu cầu 13/11.",
        "",
        "| Phiên bản | Nhóm | Reply | Voice | Ngôn ngữ cũ → mới "
        "| Độ dài cũ → mới | Unknown |",
        "|---|---|---:|---:|---:|---:|---:|",
    ]
    for version in ("persona.v6", "persona.v7"):
        for group in run.GROUPS:
            group_identity = (version, group)
            values = [
                f"{before[(*group_identity, flag)]} → {after[(*group_identity, flag)]}"
                for flag in ("language_flag", "voice_length_flag")
            ]
            table.append(
                f"| {version} | {group} | {complete[group_identity]} "
                f"| {voice[group_identity]} | {values[0]} | {values[1]} "
                f"| {unknown[group_identity]} |"
            )
        totals = [
            f"{sum(before[(version, g, flag)] for g in run.GROUPS)} → "
            f"{sum(after[(version, g, flag)] for g in run.GROUPS)}"
            for flag in ("language_flag", "voice_length_flag")
        ]
        table.append(
            f"| **{version}** | **Tổng** "
            f"| {sum(complete[(version, g)] for g in run.GROUPS)} "
            f"| {sum(voice[(version, g)] for g in run.GROUPS)} "
            f"| **{totals[0]}** | **{totals[1]}** "
            f"| {sum(unknown[(version, g)] for g in run.GROUPS)} |"
        )
    table += [
        "",
        "## Cờ độ dài biến mất vì bỏ chặn dưới",
        "",
        "12 lượt: v6 gỡ 3, còn 6/35 cờ; v7 gỡ 9, còn 0/35 cờ. "
        "Không có reply nào mới hoặc thay đổi case/prompt.",
        "",
        "| Lượt | ID | Bản | Lần | Nhóm | Từ | Lý do gỡ |",
        "|---:|---|---|---:|---|---:|---|",
    ]
    for item in removed:
        table.append(
            f"| {item['attempt']} | {item['case_id']} | {item['version']} "
            f"| {item['repetition']} | {item['group']} | {item['word_count']} "
            "| Chỉ dưới 20 từ; không vượt 45 |"
        )
    table += [
        "",
        "## Cờ ngôn ngữ riêng nhóm out_of_scope",
        "",
        "10 lượt: v6 = 4, v7 = 6. en = tiếng Anh; vi = tiếng Việt. "
        "Cột dòng đầu trích đúng dòng vật lý đầu tiên, không rút gọn. "
        "Lượt 46 bắt đầu bằng code Python, sau đó có lời tiếng Việt; "
        "không coi tên hàm/code là lời giải thích tiếng Anh.",
        "",
        "| Bản | ID | Lần | Người dùng | Phản hồi | Dòng đầu phản hồi |",
        "|---|---|---:|---|---|---|",
    ]
    language_details.sort(
        key=lambda item: (item["version"], item["case_id"], item["repetition"])
    )
    for item in language_details:
        first_line = item["first_line"].replace("|", "\\|").replace("`", "&#96;")
        reply_language = item["reply_language"]
        if item["reply_contains_code"]:
            reply_language += " + code Python"
        table.append(
            f"| {item['version']} | {item['case_id']} | {item['repetition']} "
            f"| {item['user_language']} | {reply_language} | {first_line} |"
        )
    table += [
        "",
        "## Phân loại từng cờ",
        "",
        "34 cờ lịch sử: 16 ngôn ngữ giữ nguyên, 6 quá dài giữ nguyên, "
        "12 dưới 20 từ đã gỡ (`removed_lower_bound`). "
        "`model_rule_violation` chỉ áp dụng cho cờ còn lại, "
        "không phải chấm đạt/trượt toàn bộ ngữ nghĩa. "
        "flag_reviews.json giữ nhận xét lịch sử 12/11 và hash reply; "
        "CSV/bảng này thể hiện quy tắc mới ngày 13/11.",
        "",
        "| Lượt | Review | ID | Bản/lần | Nhóm | Cờ | Từ | Còn cờ | Phân loại/lý do |",
        "|---:|---|---|---|---|---|---:|---|---|",
    ]
    for item in details:
        table.append(
            f"| {item['attempt']} | {item['review_id']} | {item['case_id']} "
            f"| {item['version']}/{item['repetition']} | {item['group']} "
            f"| {item['flag']} | {item['word_count']} | {item['new_flag']} "
            f"| {item['classification']}: {item['reason']} |"
        )
    (output / "SCREENING.md").write_text("\n".join(table) + "\n", encoding="utf-8")
    for name, payload in (
        ("removed_voice_flags.json", removed),
        ("out_of_scope_language.json", language_details),
    ):
        (output / name).write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
    (output / "metadata.json").write_text(
        json.dumps(
            {
                "source_results_sha256": run.digest(
                    (SOURCE / "results.jsonl").read_text(encoding="utf-8")
                ),
                "screening_source_sha256": run.digest(
                    (run.ROOT / "screening.py").read_text(encoding="utf-8")
                ),
                "automatic_checks_source_sha256": run.digest(
                    (run.ROOT / "run.py").read_text(encoding="utf-8")
                ),
                "updated_date": "2026-11-13",
                "voice_length_policy": {
                    "maximum_words": 45,
                    "minimum_enforced": False,
                    "counting": "whitespace",
                },
                "flag_judgments": "agent_review_no_llm_judge_api",
                "teacher_semantic_grading": "pending",
                "sample_size_warning": "20 cases, 3 repeated replies/version",
            },
            indent=2,
        ),
        encoding="utf-8",
    )


if __name__ == "__main__":
    generate()
