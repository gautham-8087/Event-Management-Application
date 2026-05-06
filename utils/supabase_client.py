import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv

load_dotenv()


def _load_rows(filepath: Path) -> List[Dict[str, Any]]:
    if not filepath.exists():
        return []
    try:
        return json.loads(filepath.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []


def _save_rows(filepath: Path, rows: List[Dict[str, Any]]) -> None:
    filepath.parent.mkdir(parents=True, exist_ok=True)
    filepath.write_text(json.dumps(rows, indent=2), encoding="utf-8")


@dataclass
class LocalQueryResult:
    data: List[Dict[str, Any]]
    count: Optional[int] = None


class LocalTableQuery:
    def __init__(self, client: "LocalSupabaseClient", table_name: str):
        self._client = client
        self._table_name = table_name
        self._op = "select"
        self._payload: Any = None
        self._filters: List[tuple[str, Any]] = []
        self._selected_columns: Optional[List[str]] = None
        self._count_exact = False
        self._order_column: Optional[str] = None
        self._order_desc = False

    def select(self, columns: str = "*", count: Optional[str] = None):
        self._op = "select"
        self._selected_columns = None if columns == "*" else [c.strip() for c in columns.split(",")]
        self._count_exact = count == "exact"
        return self

    def insert(self, payload: Any):
        self._op = "insert"
        self._payload = payload
        return self

    def upsert(self, payload: Any):
        self._op = "upsert"
        self._payload = payload
        return self

    def update(self, payload: Dict[str, Any]):
        self._op = "update"
        self._payload = payload
        return self

    def delete(self):
        self._op = "delete"
        return self

    def eq(self, field: str, value: Any):
        self._filters.append((field, value))
        return self

    def order(self, column: str, desc: bool = False):
        self._order_column = column
        self._order_desc = desc
        return self

    def execute(self) -> LocalQueryResult:
        rows = self._client._read_table(self._table_name)
        filtered = [r for r in rows if all(r.get(field) == value for field, value in self._filters)]

        if self._op == "select":
            data = filtered
            if self._order_column:
                data = sorted(data, key=lambda r: r.get(self._order_column) or "", reverse=self._order_desc)
            if self._selected_columns is not None and self._selected_columns != ["count"]:
                data = [{k: row.get(k) for k in self._selected_columns} for row in data]
            result = LocalQueryResult(data=data, count=(len(filtered) if self._count_exact else None))
            return result

        if self._op in ("insert", "upsert"):
            payload_rows = self._payload if isinstance(self._payload, list) else [self._payload]
            if self._op == "insert":
                rows.extend(payload_rows)
            else:
                for new_row in payload_rows:
                    updated = False
                    for idx, existing in enumerate(rows):
                        if self._same_identity(existing, new_row):
                            rows[idx] = {**existing, **new_row}
                            updated = True
                            break
                    if not updated:
                        rows.append(new_row)
            self._client._write_table(self._table_name, rows)
            return LocalQueryResult(data=payload_rows)

        if self._op == "update":
            updated_rows: List[Dict[str, Any]] = []
            for idx, existing in enumerate(rows):
                if all(existing.get(field) == value for field, value in self._filters):
                    rows[idx] = {**existing, **self._payload}
                    updated_rows.append(rows[idx])
            self._client._write_table(self._table_name, rows)
            return LocalQueryResult(data=updated_rows)

        if self._op == "delete":
            kept_rows = [r for r in rows if not all(r.get(field) == value for field, value in self._filters)]
            deleted_rows = [r for r in rows if r not in kept_rows]
            self._client._write_table(self._table_name, kept_rows)
            return LocalQueryResult(data=deleted_rows)

        return LocalQueryResult(data=[])

    @staticmethod
    def _same_identity(old_row: Dict[str, Any], new_row: Dict[str, Any]) -> bool:
        for key in ("id", "email"):
            if key in old_row and key in new_row and old_row.get(key) == new_row.get(key):
                return True
        return False


class LocalSupabaseClient:
    def __init__(self, data_dir: Path):
        self._data_dir = data_dir
        self._table_files = {
            "events": self._data_dir / "events.json",
            "resources": self._data_dir / "resources.json",
            "allocations": self._data_dir / "allocations.json",
            "users": self._data_dir / "users.json",
            "pending_events": self._data_dir / "pending_events.json",
            "deletion_requests": self._data_dir / "deletion_requests.json",
            "archived_events": self._data_dir / "archived_events.json",
        }
        self._ensure_table_files()

    def table(self, table_name: str) -> LocalTableQuery:
        if table_name not in self._table_files:
            self._table_files[table_name] = self._data_dir / f"{table_name}.json"
            self._ensure_table_file(self._table_files[table_name])
        return LocalTableQuery(self, table_name)

    def _ensure_table_files(self) -> None:
        self._data_dir.mkdir(parents=True, exist_ok=True)
        for path in self._table_files.values():
            self._ensure_table_file(path)

    def _ensure_table_file(self, path: Path) -> None:
        if not path.exists():
            _save_rows(path, [])

    def _read_table(self, table_name: str) -> List[Dict[str, Any]]:
        return _load_rows(self._table_files[table_name])

    def _write_table(self, table_name: str, rows: List[Dict[str, Any]]) -> None:
        _save_rows(self._table_files[table_name], rows)


def _create_local_client() -> LocalSupabaseClient:
    project_root = Path(__file__).resolve().parents[1]
    return LocalSupabaseClient(project_root / "data")


url: Optional[str] = os.environ.get("SUPABASE_URL")
key: Optional[str] = os.environ.get("SUPABASE_KEY")
supabase: Any = None

if url and key:
    try:
        from supabase import create_client

        supabase = create_client(url, key)
        # If DNS/network is broken, fail fast and use local storage instead.
        supabase.table("users").select("id", count="exact").execute()
    except Exception as e:
        print(f"Supabase unavailable, using local storage fallback: {e}")
        supabase = _create_local_client()
else:
    print("Supabase URL or Key not found. Using local storage fallback.")
    supabase = _create_local_client()