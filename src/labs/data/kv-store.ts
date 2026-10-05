import type { Lab, LabLevel } from '../../core/types'

/** Python source: raw template (backslashes kept as typed), leading newline dropped. */
const py = (s: TemplateStringsArray) => s.raw[0].replace(/^\n/, '')

/* ---------------------------------------------------------------- starter */

const STARTER = py`
class InMemoryDB:
    """An in-memory database of records.

    Each record lives under a string key and maps string field names to
    string values, like a tiny row:

        "user:1" -> {"name": "Ada", "lang": "Python"}
    """

    def __init__(self) -> None:
        # TODO: choose a structure for key -> field -> value
        pass

    def set(self, key: str, field: str, value: str) -> None:
        """Store value in field of record key (create the record or overwrite the field)."""
        raise NotImplementedError

    def get(self, key: str, field: str) -> str | None:
        """Return the value of field in record key, or None if either is missing."""
        raise NotImplementedError

    def delete(self, key: str, field: str) -> bool:
        """Remove field from record key. Return True if it existed, else False."""
        raise NotImplementedError
`

/* ---------------------------------------------------------------- level 1 */

const L1_TESTS = py`
def test_l1_get_missing_returns_none():
    db = InMemoryDB()
    got = db.get("user:1", "name")
    assert got is None, f"get() on an empty database should return None, got {got!r}"


def test_l1_set_then_get():
    db = InMemoryDB()
    result = db.set("user:1", "name", "Ada")
    assert result is None, f"set() should return None, got {result!r}"
    got = db.get("user:1", "name")
    assert got == "Ada", f"get('user:1', 'name') returned {got!r}, expected 'Ada'"


def test_l1_set_overwrites():
    db = InMemoryDB()
    db.set("user:1", "name", "Ada")
    db.set("user:1", "name", "Grace")
    got = db.get("user:1", "name")
    assert got == "Grace", f"a second set() should overwrite the field; get() returned {got!r}"


def test_l1_fields_are_independent():
    db = InMemoryDB()
    db.set("user:1", "name", "Ada")
    db.set("user:1", "lang", "Python")
    assert db.get("user:1", "name") == "Ada", "setting 'lang' must not change 'name'"
    assert db.get("user:1", "lang") == "Python", "both fields should be stored"


def test_l1_keys_are_independent():
    db = InMemoryDB()
    db.set("user:1", "name", "Ada")
    db.set("user:2", "name", "Grace")
    assert db.get("user:1", "name") == "Ada", "records must not share fields"
    assert db.get("user:2", "name") == "Grace", "records must not share fields"
    assert db.get("user:3", "name") is None, "a record that was never written reads as None"


def test_l1_missing_field_in_existing_record():
    db = InMemoryDB()
    db.set("user:1", "name", "Ada")
    got = db.get("user:1", "email")
    assert got is None, f"a field that was never set should read as None, got {got!r}"


def test_l1_delete_existing_field():
    db = InMemoryDB()
    db.set("user:1", "name", "Ada")
    db.set("user:1", "lang", "Python")
    assert db.delete("user:1", "name") is True, "delete() of an existing field should return True"
    assert db.get("user:1", "name") is None, "a deleted field should read as None"
    assert db.get("user:1", "lang") == "Python", "delete() must only remove that one field"


def test_l1_delete_missing_returns_false():
    db = InMemoryDB()
    assert db.delete("nope", "name") is False, "delete() on a missing record should return False"
    db.set("user:1", "name", "Ada")
    assert db.delete("user:1", "email") is False, "delete() of a missing field should return False"


def test_l1_delete_twice():
    db = InMemoryDB()
    db.set("k", "f", "v")
    assert db.delete("k", "f") is True, "the first delete() should return True"
    assert db.delete("k", "f") is False, "the second delete() of the same field should return False"


def test_l1_set_after_delete():
    db = InMemoryDB()
    db.set("k", "f", "v1")
    db.delete("k", "f")
    db.set("k", "f", "v2")
    got = db.get("k", "f")
    assert got == "v2", f"a field can be set again after it was deleted; get() returned {got!r}"


def test_l1_empty_string_is_a_value():
    db = InMemoryDB()
    db.set("k", "f", "")
    got = db.get("k", "f")
    assert got == "", f"an empty string is a real value; get() returned {got!r}, expected ''"
    assert db.delete("k", "f") is True, "deleting a field whose value is '' should return True"


def test_l1_instances_do_not_share_state():
    a = InMemoryDB()
    b = InMemoryDB()
    a.set("k", "f", "v")
    got = b.get("k", "f")
    assert got is None, f"two InMemoryDB() instances must not share data (a class-level dict?); got {got!r}"
`

const L1_SOLUTION = py`
class InMemoryDB:
    def __init__(self) -> None:
        self._records: dict[str, dict[str, str]] = {}

    def set(self, key: str, field: str, value: str) -> None:
        self._records.setdefault(key, {})[field] = value

    def get(self, key: str, field: str) -> str | None:
        return self._records.get(key, {}).get(field)

    def delete(self, key: str, field: str) -> bool:
        record = self._records.get(key)
        if record is None or field not in record:
            return False
        del record[field]
        if not record:
            del self._records[key]  # a record with no fields no longer exists
        return True
`

const level1: LabLevel = {
  title: 'Records and fields',
  spec: `Build the core of an in-memory database. It stores **records**: each record has a string **key** and holds any number of string **fields**, each with a string **value**.

Implement three methods on \`InMemoryDB\`:

- \`set(key, field, value)\` stores \`value\` under \`field\` in record \`key\`. It creates the record if needed, overwrites an existing field, and returns \`None\`.
- \`get(key, field)\` returns the value, or \`None\` if the record or the field doesn't exist.
- \`delete(key, field)\` removes the field and returns \`True\`, or returns \`False\` if there was nothing to remove. A record with no fields left no longer exists.

Example:

\`db = InMemoryDB()\`
\`db.set("user:1", "name", "Ada")\`
\`db.get("user:1", "name")\` → \`"Ada"\`
\`db.get("user:1", "email")\` → \`None\`
\`db.delete("user:1", "name")\` → \`True\`
\`db.delete("user:1", "name")\` → \`False\`

An empty string is a real value: after \`db.set("k", "f", "")\`, \`get\` returns \`""\`, not \`None\`.`,
  tests: L1_TESTS,
  hints: [
    'A dict of dicts fits exactly: `key -> {field: value}`. Create it in `__init__` so every instance gets its own.',
    '`dict.setdefault(key, {})` returns the inner dict, creating it on first use, so `set` is one line.',
    'For `delete`, check `field in record` rather than the truthiness of the value; `""` is falsy but present.',
  ],
  solution: L1_SOLUTION,
}

/* ---------------------------------------------------------------- level 2 */

const L2_TESTS = py`
def _l2_db():
    db = InMemoryDB()
    db.set("user:1", "name", "Ada")
    db.set("user:1", "lang", "Python")
    db.set("user:1", "langv", "3.12")
    db.set("user:2", "name", "Grace")
    return db


def test_l2_scan_sorted_and_formatted():
    got = _l2_db().scan("user:1")
    want = ["lang(Python)", "langv(3.12)", "name(Ada)"]
    assert got == want, f"scan('user:1') returned {got!r}, expected {want!r}"


def test_l2_scan_missing_record():
    got = _l2_db().scan("user:404")
    assert got == [], f"scan() of a missing record should be [], got {got!r}"


def test_l2_scan_only_that_record():
    got = _l2_db().scan("user:2")
    assert got == ["name(Grace)"], f"scan('user:2') returned {got!r}; fields must not leak between records"


def test_l2_scan_uses_plain_string_order():
    db = InMemoryDB()
    for field in ["b2", "a", "b10", "B"]:
        db.set("k", field, field.upper())
    got = db.scan("k")
    want = ["B(B)", "a(A)", "b10(B10)", "b2(B2)"]
    assert got == want, f"sort by plain string order (uppercase first, 'b10' before 'b2'); got {got!r}"


def test_l2_scan_reflects_overwrite_and_delete():
    db = _l2_db()
    db.set("user:1", "name", "Grace")
    db.delete("user:1", "lang")
    got = db.scan("user:1")
    want = ["langv(3.12)", "name(Grace)"]
    assert got == want, f"scan() should show current values only; got {got!r}, expected {want!r}"


def test_l2_scan_after_deleting_everything():
    db = InMemoryDB()
    db.set("k", "f", "v")
    db.delete("k", "f")
    got = db.scan("k")
    assert got == [], f"a record with no fields left should scan as [], got {got!r}"


def test_l2_scan_empty_value():
    db = InMemoryDB()
    db.set("k", "f", "")
    got = db.scan("k")
    assert got == ["f()"], f"an empty value formats as 'f()', got {got!r}"


def test_l2_prefix_basic():
    got = _l2_db().scan_by_prefix("user:1", "lang")
    want = ["lang(Python)", "langv(3.12)"]
    assert got == want, f"scan_by_prefix('user:1', 'lang') returned {got!r}, expected {want!r}"


def test_l2_prefix_no_match():
    got = _l2_db().scan_by_prefix("user:1", "x")
    assert got == [], f"no matching fields should give [], got {got!r}"


def test_l2_prefix_empty_matches_all():
    db = _l2_db()
    got = db.scan_by_prefix("user:1", "")
    want = ["lang(Python)", "langv(3.12)", "name(Ada)"]
    assert got == want, f"an empty prefix should match every field; got {got!r}"


def test_l2_prefix_is_case_sensitive():
    got = _l2_db().scan_by_prefix("user:1", "Lang")
    assert got == [], f"prefix matching is case-sensitive, so 'Lang' should match nothing; got {got!r}"


def test_l2_prefix_whole_name_and_missing_record():
    db = _l2_db()
    got = db.scan_by_prefix("user:1", "name")
    assert got == ["name(Ada)"], f"a prefix equal to the whole field name matches it; got {got!r}"
    got = db.scan_by_prefix("user:404", "")
    assert got == [], f"a missing record gives [], got {got!r}"


def test_l2_results_are_fresh_lists():
    db = _l2_db()
    first = db.scan("user:1")
    first.clear()
    got = db.scan("user:1")
    assert len(got) == 3, f"clearing a returned list must not change the database; scan() now gives {got!r}"
`

const L2_SOLUTION = py`
class InMemoryDB:
    def __init__(self) -> None:
        self._records: dict[str, dict[str, str]] = {}

    def set(self, key: str, field: str, value: str) -> None:
        self._records.setdefault(key, {})[field] = value

    def get(self, key: str, field: str) -> str | None:
        return self._records.get(key, {}).get(field)

    def delete(self, key: str, field: str) -> bool:
        record = self._records.get(key)
        if record is None or field not in record:
            return False
        del record[field]
        if not record:
            del self._records[key]
        return True

    def scan(self, key: str) -> list[str]:
        return self.scan_by_prefix(key, "")

    def scan_by_prefix(self, key: str, prefix: str) -> list[str]:
        record = self._records.get(key, {})
        return [f"{field}({value})" for field, value in sorted(record.items()) if field.startswith(prefix)]
`

const level2: LabLevel = {
  title: 'Scan and prefix',
  spec: `Add two read-only queries that list a record's fields.

- \`scan(key)\` returns every field of record \`key\` as a list of strings formatted \`"field(value)"\`, sorted by field name in plain string order. A missing record gives \`[]\`.
- \`scan_by_prefix(key, prefix)\` is the same, but only for fields whose name starts with \`prefix\`. Matching is case-sensitive, and an empty prefix matches every field.

Example:

\`db.set("user:1", "name", "Ada")\`
\`db.set("user:1", "lang", "Python")\`
\`db.set("user:1", "langv", "3.12")\`
\`db.scan("user:1")\` → \`["lang(Python)", "langv(3.12)", "name(Ada)"]\`
\`db.scan_by_prefix("user:1", "lang")\` → \`["lang(Python)", "langv(3.12)"]\`
\`db.scan_by_prefix("user:1", "x")\` → \`[]\`

Plain string order means \`"B"\` sorts before \`"a"\`, and \`"b10"\` before \`"b2"\`. Return a fresh list each time: changing it must not change the database.`,
  tests: L2_TESTS,
  hints: [
    '`sorted(record.items())` gives `(field, value)` pairs in field order, because tuples compare by their first element first.',
    'Write `scan_by_prefix` first; `scan(key)` is just `scan_by_prefix(key, "")`, since every string starts with `""`.',
  ],
  solution: L2_SOLUTION,
}

/* ---------------------------------------------------------------- level 3 */

const L3_TESTS = py`
def test_l3_set_at_then_get_at():
    db = InMemoryDB()
    db.set_at("A", "x", "1", 1)
    got = db.get_at("A", "x", 2)
    assert got == "1", f"get_at after set_at returned {got!r}, expected '1'"
    assert db.get_at("A", "y", 3) is None, "a field that was never set reads as None"


def test_l3_permanent_field_never_expires():
    db = InMemoryDB()
    db.set_at("A", "x", "1", 1)
    got = db.get_at("A", "x", 10**9)
    assert got == "1", f"set_at fields never expire; get_at returned {got!r}"


def test_l3_ttl_window_is_half_open():
    db = InMemoryDB()
    db.set_at_with_ttl("A", "x", "1", 10, 5)
    assert db.get_at("A", "x", 10) == "1", "a field is alive at its own timestamp (10)"
    assert db.get_at("A", "x", 14) == "1", "a field is alive at timestamp + ttl - 1 (14)"
    got = db.get_at("A", "x", 15)
    assert got is None, f"the window is [10, 15): at exactly 15 the field has expired, but get_at returned {got!r}"


def test_l3_delete_at_expired_returns_false():
    db = InMemoryDB()
    db.set_at_with_ttl("A", "x", "1", 1, 3)
    got = db.delete_at("A", "x", 4)
    assert got is False, f"delete_at of an expired field should return False, got {got!r}"


def test_l3_delete_at_live_field():
    db = InMemoryDB()
    db.set_at_with_ttl("A", "x", "1", 1, 10)
    assert db.delete_at("A", "x", 5) is True, "delete_at of a live field should return True"
    assert db.get_at("A", "x", 6) is None, "a deleted field reads as None"
    assert db.delete_at("A", "x", 7) is False, "deleting it again returns False"


def test_l3_set_at_clears_ttl():
    db = InMemoryDB()
    db.set_at_with_ttl("A", "x", "1", 1, 5)
    db.set_at("A", "x", "2", 3)
    got = db.get_at("A", "x", 100)
    assert got == "2", f"set_at on a field with a TTL makes it permanent; get_at returned {got!r}"


def test_l3_new_ttl_starts_from_new_timestamp():
    db = InMemoryDB()
    db.set_at_with_ttl("A", "x", "1", 1, 5)   # alive [1, 6)
    db.set_at_with_ttl("A", "x", "2", 4, 5)   # alive [4, 9)
    got = db.get_at("A", "x", 8)
    assert got == "2", f"the second TTL window runs from its own timestamp, [4, 9); get_at(8) returned {got!r}"
    got = db.get_at("A", "x", 9)
    assert got is None, f"the second window ends at 4 + 5 = 9; get_at(9) returned {got!r}"


def test_l3_ttl_can_shorten_a_permanent_field():
    db = InMemoryDB()
    db.set_at("A", "x", "1", 1)
    db.set_at_with_ttl("A", "x", "2", 2, 2)   # alive [2, 4)
    assert db.get_at("A", "x", 3) == "2", "the new value is visible inside its window"
    got = db.get_at("A", "x", 4)
    assert got is None, f"re-setting with a TTL makes a permanent field temporary; get_at(4) returned {got!r}"


def test_l3_set_after_expiry_revives():
    db = InMemoryDB()
    db.set_at_with_ttl("A", "x", "1", 1, 2)   # alive [1, 3)
    assert db.get_at("A", "x", 5) is None, "expired at 3"
    db.set_at("A", "x", "2", 6)
    got = db.get_at("A", "x", 7)
    assert got == "2", f"an expired field can be set again; get_at returned {got!r}"


def test_l3_scan_at_skips_expired():
    db = InMemoryDB()
    db.set_at_with_ttl("A", "a", "1", 1, 10)  # alive [1, 11)
    db.set_at("A", "b", "2", 2)
    db.set_at_with_ttl("A", "c", "3", 3, 2)   # alive [3, 5)
    got = db.scan_at("A", 4)
    assert got == ["a(1)", "b(2)", "c(3)"], f"scan_at at t=4 returned {got!r}"
    got = db.scan_at("A", 5)
    assert got == ["a(1)", "b(2)"], f"c expires at 5; scan_at returned {got!r}"
    got = db.scan_at("A", 11)
    assert got == ["b(2)"], f"a expires at 11; scan_at returned {got!r}"


def test_l3_scan_by_prefix_at_skips_expired():
    db = InMemoryDB()
    db.set_at_with_ttl("A", "lang", "Python", 1, 5)  # alive [1, 6)
    db.set_at("A", "langv", "3.12", 2)
    db.set_at("A", "name", "Ada", 3)
    got = db.scan_by_prefix_at("A", "lang", 5)
    assert got == ["lang(Python)", "langv(3.12)"], f"at t=5 both lang fields are alive; got {got!r}"
    got = db.scan_by_prefix_at("A", "lang", 6)
    assert got == ["langv(3.12)"], f"at t=6 'lang' has expired; got {got!r}"


def test_l3_fully_expired_record_scans_empty():
    db = InMemoryDB()
    db.set_at_with_ttl("A", "x", "1", 1, 1)
    db.set_at_with_ttl("A", "y", "2", 1, 2)
    got = db.scan_at("A", 3)
    assert got == [], f"when every field has expired the record scans as [], got {got!r}"
    assert db.get_at("A", "y", 3) is None, "y expired at 3"


def test_l3_expiry_is_per_record():
    db = InMemoryDB()
    db.set_at_with_ttl("A", "x", "1", 1, 2)
    db.set_at("B", "x", "2", 1)
    assert db.get_at("A", "x", 3) is None, "A.x expired at 3"
    got = db.get_at("B", "x", 3)
    assert got == "2", f"a TTL on A.x must not affect B.x; get_at returned {got!r}"
`

const L3_SOLUTION = py`
class InMemoryDB:
    """Each field is stored as (value, expires_at); expires_at None means never."""

    def __init__(self) -> None:
        self._records: dict[str, dict[str, tuple[str, int | None]]] = {}

    @staticmethod
    def _alive(entry: tuple[str, int | None], timestamp: int) -> bool:
        expires_at = entry[1]
        return expires_at is None or timestamp < expires_at

    # ---- timed API (level 3)

    def set_at(self, key: str, field: str, value: str, timestamp: int) -> None:
        self._records.setdefault(key, {})[field] = (value, None)

    def set_at_with_ttl(self, key: str, field: str, value: str, timestamp: int, ttl: int) -> None:
        self._records.setdefault(key, {})[field] = (value, timestamp + ttl)

    def get_at(self, key: str, field: str, timestamp: int) -> str | None:
        entry = self._records.get(key, {}).get(field)
        if entry is None or not self._alive(entry, timestamp):
            return None
        return entry[0]

    def delete_at(self, key: str, field: str, timestamp: int) -> bool:
        record = self._records.get(key)
        if record is None or field not in record:
            return False
        was_alive = self._alive(record[field], timestamp)
        del record[field]  # an expired entry is garbage either way
        if not record:
            del self._records[key]
        return was_alive

    def scan_at(self, key: str, timestamp: int) -> list[str]:
        return self.scan_by_prefix_at(key, "", timestamp)

    def scan_by_prefix_at(self, key: str, prefix: str, timestamp: int) -> list[str]:
        record = self._records.get(key, {})
        return [
            f"{field}({entry[0]})"
            for field, entry in sorted(record.items())
            if field.startswith(prefix) and self._alive(entry, timestamp)
        ]

    # ---- untimed API (levels 1-2): runs at time 0; tests never mix the two styles

    def set(self, key: str, field: str, value: str) -> None:
        self.set_at(key, field, value, 0)

    def get(self, key: str, field: str) -> str | None:
        return self.get_at(key, field, 0)

    def delete(self, key: str, field: str) -> bool:
        return self.delete_at(key, field, 0)

    def scan(self, key: str) -> list[str]:
        return self.scan_at(key, 0)

    def scan_by_prefix(self, key: str, prefix: str) -> list[str]:
        return self.scan_by_prefix_at(key, prefix, 0)
`

const level3: LabLevel = {
  title: 'Timestamps and TTL',
  spec: `Real stores care about **time**. Add a timestamped version of every operation. Timestamps are integers and never go backwards between calls (they may repeat). Tests never mix the timed and untimed methods on one database.

- \`set_at(key, field, value, timestamp)\` works like \`set\`. The field never expires.
- \`set_at_with_ttl(key, field, value, timestamp, ttl)\` stores a field that is alive for \`ttl\` time units: at every time \`t\` with \`timestamp <= t < timestamp + ttl\`. \`ttl\` is at least 1.
- \`get_at(key, field, timestamp)\`, \`delete_at(key, field, timestamp)\`, \`scan_at(key, timestamp)\` and \`scan_by_prefix_at(key, prefix, timestamp)\` work like their untimed versions, except an **expired field behaves exactly as if it doesn't exist**: \`get_at\` returns \`None\`, \`delete_at\` returns \`False\`, scans leave it out.

Setting a field again replaces both its value and its lifetime: \`set_at\` makes it permanent, and \`set_at_with_ttl\` starts a fresh window from the new timestamp.

Example:

\`db.set_at_with_ttl("A", "x", "1", 10, 5)\`   alive for 10 ≤ t < 15
\`db.set_at("A", "y", "2", 11)\`   never expires
\`db.get_at("A", "x", 14)\` → \`"1"\`
\`db.scan_at("A", 15)\` → \`["y(2)"]\`   x expired at exactly 15
\`db.delete_at("A", "x", 16)\` → \`False\`

The level 1 and 2 methods must keep passing their tests.`,
  tests: L3_TESTS,
  hints: [
    'Store `(value, expires_at)` per field instead of just the value, with `expires_at = None` for "never". Then expiry is one comparison: alive while `timestamp < expires_at`.',
    "Don't delete expired fields eagerly. Check liveness when you read (lazy expiry); the timestamp in each call tells you what \"now\" is.",
    'To keep levels 1 and 2 passing with no duplicated logic, make the untimed methods call the timed ones with a fixed timestamp such as 0.',
  ],
  solution: L3_SOLUTION,
}

/* ---------------------------------------------------------------- level 4 */

const L4_TESTS = py`
def test_l4_backup_counts_non_empty_records():
    db = InMemoryDB()
    db.set_at("A", "x", "1", 1)
    db.set_at("B", "x", "1", 2)
    db.set_at("B", "y", "2", 3)
    got = db.backup(4)
    assert got == 2, f"backup() should return the number of non-empty records (2), got {got!r}"


def test_l4_backup_empty_database():
    db = InMemoryDB()
    got = db.backup(1)
    assert got == 0, f"backup() of an empty database should return 0, got {got!r}"


def test_l4_backup_skips_expired_and_deleted():
    db = InMemoryDB()
    db.set_at_with_ttl("A", "x", "1", 1, 2)   # expired from 3
    db.set_at("B", "x", "1", 2)
    db.set_at("C", "x", "1", 3)
    db.delete_at("C", "x", 4)
    got = db.backup(5)
    assert got == 1, f"only B has a live field at t=5, so backup() should return 1, got {got!r}"


def test_l4_restore_brings_back_deleted_fields():
    db = InMemoryDB()
    db.set_at("A", "x", "1", 1)
    db.backup(2)
    db.delete_at("A", "x", 3)
    assert db.get_at("A", "x", 4) is None, "deleted at 3"
    db.restore(5, 2)
    got = db.get_at("A", "x", 6)
    assert got == "1", f"restore() should bring back A.x; get_at returned {got!r}"


def test_l4_restore_replaces_everything():
    db = InMemoryDB()
    db.set_at("A", "x", "1", 1)
    db.backup(2)
    db.set_at("A", "x", "changed", 3)
    db.set_at("A", "new", "1", 4)
    db.set_at("Z", "z", "1", 5)
    db.restore(6, 2)
    assert db.get_at("A", "x", 7) == "1", "restore() should undo later overwrites"
    got = db.scan_at("A", 7)
    assert got == ["x(1)"], f"fields added after the backup should be gone; scan_at returned {got!r}"
    got = db.scan_at("Z", 7)
    assert got == [], f"records added after the backup should be gone; scan_at returned {got!r}"


def test_l4_restore_rebases_ttl():
    db = InMemoryDB()
    db.set_at_with_ttl("A", "x", "1", 10, 20)  # alive [10, 30)
    db.backup(25)                              # 5 units left
    db.restore(100, 25)                        # alive [100, 105)
    got = db.get_at("A", "x", 104)
    assert got == "1", f"the restored field keeps its remaining 5 units, so it is alive at 104; got {got!r}"
    got = db.get_at("A", "x", 105)
    assert got is None, f"it expires at restore time + remaining ttl = 105; get_at returned {got!r}"


def test_l4_spec_example():
    db = InMemoryDB()
    db.set_at_with_ttl("A", "x", "1", 10, 20)
    db.set_at("B", "y", "2", 12)
    assert db.backup(15) == 2, "two records at t=15"
    assert db.delete_at("B", "y", 20) is True, "B.y is live at 20"
    db.restore(40, 15)
    assert db.get_at("A", "x", 54) == "1", "x had 15 units left, so it is alive in [40, 55)"
    assert db.get_at("A", "x", 55) is None, "x expires at 55"
    got = db.get_at("B", "y", 56)
    assert got == "2", f"permanent fields stay permanent after restore; get_at returned {got!r}"


def test_l4_restore_picks_latest_backup_at_or_before():
    db = InMemoryDB()
    db.set_at("A", "v", "one", 1)
    db.backup(10)
    db.set_at("A", "v", "two", 11)
    db.backup(20)
    db.set_at("A", "v", "three", 21)
    db.backup(30)
    db.restore(40, 25)
    got = db.get_at("A", "v", 41)
    assert got == "two", f"restore(40, 25) should use the backup taken at 20; got {got!r}"
    db.restore(50, 10)
    got = db.get_at("A", "v", 51)
    assert got == "one", f"restore(50, 10) should use the backup taken exactly at 10; got {got!r}"
    db.restore(60, 99)
    got = db.get_at("A", "v", 61)
    assert got == "three", f"restore(60, 99) should use the latest backup (30); got {got!r}"


def test_l4_restore_without_backup_raises():
    db = InMemoryDB()
    db.set_at("A", "x", "1", 1)
    db.backup(10)
    try:
        db.restore(20, 5)
    except ValueError:
        pass
    else:
        raise AssertionError("restore() with no backup at or before timestamp_to_restore should raise ValueError")
    got = db.get_at("A", "x", 21)
    assert got == "1", f"a failed restore must leave the database unchanged; get_at returned {got!r}"


def test_l4_backup_is_a_snapshot():
    db = InMemoryDB()
    db.set_at("A", "x", "1", 1)
    db.backup(2)
    db.set_at("A", "x", "2", 3)
    db.set_at("A", "y", "2", 4)
    db.restore(5, 2)
    got = db.scan_at("A", 6)
    assert got == ["x(1)"], f"writes after backup() leaked into the snapshot (copy it, don't alias it); got {got!r}"


def test_l4_restored_state_is_independent_of_backup():
    db = InMemoryDB()
    db.set_at("A", "x", "1", 1)
    db.backup(2)
    db.restore(3, 2)
    db.set_at("A", "x", "edited", 4)
    db.set_at("A", "y", "new", 5)
    db.restore(6, 2)
    got = db.scan_at("A", 7)
    assert got == ["x(1)"], f"edits after a restore must not change the stored backup; got {got!r}"


def test_l4_remaining_ttl_measured_at_backup_time():
    db = InMemoryDB()
    db.set_at_with_ttl("A", "x", "1", 0, 10)   # alive [0, 10)
    db.set_at_with_ttl("A", "y", "2", 0, 100)  # alive [0, 100)
    db.backup(8)                               # x: 2 left, y: 92 left
    db.restore(50, 8)                          # x: [50, 52), y: [50, 142)
    assert db.scan_at("A", 51) == ["x(1)", "y(2)"], "both fields are alive just after the restore"
    got = db.scan_at("A", 52)
    assert got == ["y(2)"], f"x had 2 units left at backup time, so it expires at 52; scan_at returned {got!r}"
    assert db.get_at("A", "y", 141) == "2", "y had 92 units left: alive until 142"
    assert db.get_at("A", "y", 142) is None, "y expires at 50 + 92 = 142"


def test_l4_counts_after_restore():
    db = InMemoryDB()
    db.set_at("A", "x", "1", 1)
    db.set_at("B", "x", "1", 2)
    db.backup(3)
    db.delete_at("A", "x", 4)
    assert db.backup(5) == 1, "only B is left at t=5"
    db.restore(6, 3)
    got = db.backup(7)
    assert got == 2, f"after restoring the first backup both records exist again; backup() returned {got!r}"
`

const L4_SOLUTION = py`
import bisect


class InMemoryDB:
    """Each field is stored as (value, expires_at); expires_at None means never."""

    def __init__(self) -> None:
        self._records: dict[str, dict[str, tuple[str, int | None]]] = {}
        # (timestamp, snapshot) in the order taken; timestamps never decrease.
        # A snapshot maps key -> {field: (value, remaining_ttl or None)}.
        self._backups: list[tuple[int, dict[str, dict[str, tuple[str, int | None]]]]] = []

    @staticmethod
    def _alive(entry: tuple[str, int | None], timestamp: int) -> bool:
        expires_at = entry[1]
        return expires_at is None or timestamp < expires_at

    # ---- timed API (level 3)

    def set_at(self, key: str, field: str, value: str, timestamp: int) -> None:
        self._records.setdefault(key, {})[field] = (value, None)

    def set_at_with_ttl(self, key: str, field: str, value: str, timestamp: int, ttl: int) -> None:
        self._records.setdefault(key, {})[field] = (value, timestamp + ttl)

    def get_at(self, key: str, field: str, timestamp: int) -> str | None:
        entry = self._records.get(key, {}).get(field)
        if entry is None or not self._alive(entry, timestamp):
            return None
        return entry[0]

    def delete_at(self, key: str, field: str, timestamp: int) -> bool:
        record = self._records.get(key)
        if record is None or field not in record:
            return False
        was_alive = self._alive(record[field], timestamp)
        del record[field]
        if not record:
            del self._records[key]
        return was_alive

    def scan_at(self, key: str, timestamp: int) -> list[str]:
        return self.scan_by_prefix_at(key, "", timestamp)

    def scan_by_prefix_at(self, key: str, prefix: str, timestamp: int) -> list[str]:
        record = self._records.get(key, {})
        return [
            f"{field}({entry[0]})"
            for field, entry in sorted(record.items())
            if field.startswith(prefix) and self._alive(entry, timestamp)
        ]

    # ---- backups (level 4)

    def backup(self, timestamp: int) -> int:
        snapshot = {}
        for key, record in self._records.items():
            live = {}
            for field, (value, expires_at) in record.items():
                if expires_at is None:
                    live[field] = (value, None)
                elif timestamp < expires_at:
                    live[field] = (value, expires_at - timestamp)  # remaining ttl
            if live:
                snapshot[key] = live
        self._backups.append((timestamp, snapshot))
        return len(snapshot)

    def restore(self, timestamp: int, timestamp_to_restore: int) -> None:
        i = bisect.bisect_right(self._backups, timestamp_to_restore, key=lambda b: b[0])
        if i == 0:
            raise ValueError(f"no backup at or before {timestamp_to_restore}")
        snapshot = self._backups[i - 1][1]
        # Build fresh dicts: later writes must never reach the stored snapshot.
        self._records = {
            key: {
                field: (value, None if remaining is None else timestamp + remaining)
                for field, (value, remaining) in fields.items()
            }
            for key, fields in snapshot.items()
        }

    # ---- untimed API (levels 1-2): runs at time 0; tests never mix the two styles

    def set(self, key: str, field: str, value: str) -> None:
        self.set_at(key, field, value, 0)

    def get(self, key: str, field: str) -> str | None:
        return self.get_at(key, field, 0)

    def delete(self, key: str, field: str) -> bool:
        return self.delete_at(key, field, 0)

    def scan(self, key: str) -> list[str]:
        return self.scan_at(key, 0)

    def scan_by_prefix(self, key: str, prefix: str) -> list[str]:
        return self.scan_by_prefix_at(key, prefix, 0)
`

const level4: LabLevel = {
  title: 'Backup and restore',
  spec: `Add **point-in-time backups**. A backup is a snapshot of every live field, remembered under the timestamp it was taken.

- \`backup(timestamp)\` saves a snapshot of the database as it is at \`timestamp\` and returns the number of **non-empty records**: records with at least one live field. Expired fields are not saved. For a field with a TTL, the snapshot keeps its **remaining** lifetime, \`expires_at - timestamp\`.
- \`restore(timestamp, timestamp_to_restore)\` replaces the whole database with the latest backup taken at or before \`timestamp_to_restore\`. Restored TTLs are **re-based**: a field saved with \`r\` units left is alive for \`timestamp <= t < timestamp + r\`. Fields without a TTL stay permanent. If there is no such backup, raise \`ValueError\` and change nothing. Restoring never deletes backups, so the same one can be restored again later.

\`timestamp_to_restore\` points into the past, so it is the one argument allowed to be smaller than earlier timestamps.

Example:

\`db.set_at_with_ttl("A", "x", "1", 10, 20)\`   alive for 10 ≤ t < 30
\`db.set_at("B", "y", "2", 12)\`
\`db.backup(15)\` → \`2\`   saves x with 15 units left, and y
\`db.delete_at("B", "y", 20)\` → \`True\`
\`db.restore(40, 15)\`   x is alive for 40 ≤ t < 55, y is back
\`db.get_at("A", "x", 54)\` → \`"1"\`
\`db.get_at("A", "x", 55)\` → \`None\`
\`db.get_at("B", "y", 56)\` → \`"2"\`

A backup is a copy. Writes after \`backup\` must not change it, and writes after \`restore\` must not change the stored backup either.`,
  tests: L4_TESTS,
  hints: [
    'Build the snapshot as brand-new dicts holding `(value, remaining)` tuples. Tuples are immutable, so a fresh outer and inner dict is a full copy; you never need `copy.deepcopy`.',
    'Backups arrive in timestamp order, so "latest at or before T" is `bisect.bisect_right(backups, T, key=lambda b: b[0]) - 1` (or a reverse linear scan while you get it working).',
    'On restore, rebuild `_records` from the snapshot with `expires_at = timestamp + remaining`. Building new dicts here is what keeps later writes from corrupting the stored backup.',
  ],
  solution: L4_SOLUTION,
}

/* -------------------------------------------------------------------- lab */

const lab: Lab = {
  id: 'kv-store',
  title: 'In-memory database',
  area: 'builds',
  summary:
    'The most commonly reported progressive build: a record store that grows **TTLs** and **point-in-time backups** over four levels. Earlier levels keep their tests, so every refactor has to keep them green.',
  minutes: 90,
  starter: STARTER,
  levels: [level1, level2, level3, level4],
  followUps: [
    'Make the store thread-safe: where do the locks go? Compare one lock around the whole database with a lock per record, and say what `backup` needs in order to see a consistent snapshot.',
    'Expired fields are only cleaned up when something touches them. With 10 million TTL fields that are never read again, memory grows without bound. Design background cleanup: a min-heap of expiry times, Redis-style random sampling, or both?',
    '`backup` copies the whole database, which is O(n) per call. How would you make it cheap: copy-on-write, persistent (immutable) maps, or an append-only log with periodic checkpoints that you replay on restore?',
    'How would you test this beyond hand-written cases? Describe a randomized test that drives your store and a dumb reference model with the same operations and timestamps, and the invariants you would assert after each step.',
  ],
}

export default lab
