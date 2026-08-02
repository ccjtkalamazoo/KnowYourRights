#!/usr/bin/env python3
"""
Validate every chapter file in content/ against the schema, plus the rules
JSON Schema cannot express on its own.

    python3 tools/validate_content.py

Exit code 0 = clean, 1 = problems found. Wire this into CI so a bad chapter
cannot merge. See docs/CONTENT.md for why each rule exists.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"
SCHEMA = CONTENT / "schema" / "chapter.schema.json"
MISCONCEPTIONS = CONTENT / "schema" / "misconceptions.json"

# Rules JSON Schema handles poorly or not at all.
EM_DASH = "\u2014"
TEXT_FIELDS = ("q", "hint", "principle")


def load(path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def schema_validate(chapter, schema, errors, label):
    try:
        import jsonschema
    except ImportError:
        errors.append(
            f"{label}: jsonschema not installed, skipping schema pass "
            "(pip install jsonschema)"
        )
        return
    validator = jsonschema.Draft202012Validator(schema)
    for err in sorted(validator.iter_errors(chapter), key=lambda e: e.path):
        loc = ".".join(str(p) for p in err.path) or "(root)"
        # jsonschema echoes the whole failing value into the message, which for a
        # 30-question chapter is thousands of lines. Keep it readable.
        msg = " ".join(err.message.split())
        if len(msg) > 160:
            msg = msg[:110] + " ... " + msg[-45:]
        errors.append(f"{label}: {loc}: {msg}")


def semantic_checks(chapter, codes, errors, warnings, label, seen_ids, seen_opt_ids):
    """The rules that matter but that a schema cannot see."""
    cid = chapter.get("chapterId", "")
    did = chapter.get("districtId", "")

    if cid and did and not cid.startswith(did + "."):
        errors.append(f"{label}: chapterId '{cid}' does not match districtId '{did}'")

    if chapter.get("reviewedBy") is None:
        warnings.append(f"{label}: NOT ATTORNEY REVIEWED (cannot ship)")

    for i, q in enumerate(chapter.get("questions", [])):
        qid = q.get("id", f"index {i}")
        where = f"{label}[{qid}]"

        # IDs must be globally unique and never reused.
        if qid in seen_ids:
            errors.append(f"{where}: duplicate question id (also in {seen_ids[qid]})")
        else:
            seen_ids[qid] = label

        # Question id must sit under its chapter.
        if cid and not str(q.get("id", "")).startswith(cid + "."):
            errors.append(f"{where}: id does not belong to chapter {cid}")

        opts = q.get("options", [])

        # Exactly one correct answer, authored at index 0.
        correct = [j for j, o in enumerate(opts) if o.get("isCorrect")]
        if len(correct) != 1:
            errors.append(f"{where}: expected exactly 1 correct option, found {len(correct)}")
        elif correct[0] != 0:
            errors.append(
                f"{where}: correct answer is at index {correct[0]}, must be authored at index 0"
            )

        # Option ids: unique, belong to this question, and letters a-d in order.
        expect = "abcd"
        for j, o in enumerate(opts):
            oid = o.get("id", "")
            if oid in seen_opt_ids:
                errors.append(f"{where}: duplicate option id {oid}")
            else:
                seen_opt_ids[oid] = where
            if qid != f"index {i}" and not oid.startswith(qid + "."):
                errors.append(f"{where}: option id {oid} does not belong to this question")
            if j < len(expect) and not oid.endswith("." + expect[j]):
                errors.append(
                    f"{where}: option {j} has id {oid}, expected suffix .{expect[j]} "
                    "(letters are permanent and must not be reordered)"
                )

            # Misconception codes must be real.
            code = o.get("misconceptionCode")
            if code and code not in codes:
                errors.append(
                    f"{where}: misconceptionCode '{code}' not in misconceptions.json"
                )

        # Em dashes anywhere in the question.
        blob = json.dumps(q, ensure_ascii=False)
        if EM_DASH in blob:
            errors.append(f"{where}: contains an em dash")

        # Sameness check: two questions in a chapter sharing both a
        # misconception code and a key phrase are probably the same question.
        # Reported as a warning, not an error, since it can be legitimate.


def sameness_check(chapter, warnings, label):
    seen = {}
    for q in chapter.get("questions", []):
        phrase = (q.get("keyPhrase") or {}).get("quote", "").strip().lower()
        for o in q.get("options", []):
            code = o.get("misconceptionCode")
            if not code or not phrase:
                continue
            key = (code, phrase)
            if key in seen:
                warnings.append(
                    f"{label}: {q.get('id')} and {seen[key]} share misconception "
                    f"'{code}' and the same key phrase. Possible duplicate."
                )
            else:
                seen[key] = q.get("id")


def main():
    if not SCHEMA.exists():
        print(f"missing schema: {SCHEMA}")
        return 1

    schema = load(SCHEMA)
    codes = set(load(MISCONCEPTIONS)["codes"]) if MISCONCEPTIONS.exists() else set()

    chapters = sorted(
        p for p in CONTENT.rglob("*.json")
        if "schema" not in p.parts
        and p.name not in ("meta.json", "index.json")
    )

    if not chapters:
        print("no chapter files found under content/ (nothing to validate yet)")
        return 0

    errors, warnings = [], []
    seen_ids, seen_opt_ids = {}, {}

    for path in chapters:
        label = str(path.relative_to(ROOT))
        try:
            chapter = load(path)
        except json.JSONDecodeError as exc:
            errors.append(f"{label}: invalid JSON: {exc}")
            continue
        schema_validate(chapter, schema, errors, label)
        semantic_checks(chapter, codes, errors, warnings, label, seen_ids, seen_opt_ids)
        sameness_check(chapter, warnings, label)

    print(f"checked {len(chapters)} chapter file(s), {len(seen_ids)} question(s)\n")

    for w in warnings:
        print(f"  WARN  {w}")
    for e in errors:
        print(f"  FAIL  {e}")

    if not errors and not warnings:
        print("  clean")
    print()
    print(f"{len(errors)} error(s), {len(warnings)} warning(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
