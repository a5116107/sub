#!/usr/bin/env python3
"""Audit frontend API calls against backend route contracts.

Default behavior audits runtime API usage only:
- frontend/src/api/**
- web-app/src/shared/api/** and web-app/src/entities/**/api/**
- web-app-v/src/api/**
- new/services/**

Optional:
- include mock routes from web-app-v/src/mocks/handlers.ts via --include-mocks
"""

from __future__ import annotations

import argparse
import json
import re
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple


@dataclass(frozen=True)
class Route:
    method: str
    path: str
    file: str
    line: int


@dataclass(frozen=True)
class CallSite:
    project: str
    method: str
    raw_path: str
    full_path: str
    file: str
    line: int
    receiver: str


GROUP_ASSIGN_RE = re.compile(r'(\w+)\s*:=\s*(\w+)\.Group\("([^"]*)"\)')
ROUTE_CALL_RE = re.compile(r'(\w+)\.(GET|POST|PUT|PATCH|DELETE|Any)\("([^"]*)"')

METHOD_CALL_RE = re.compile(
    r'([A-Za-z0-9_$.]+)\.(get|post|put|patch|delete)\s*(?:<[^>\n]*>)?\s*\(\s*([`\'"])([^`\'"\n]+)\3',
    re.I,
)
FUNCTION_CALL_RE = re.compile(
    r'(?<![A-Za-z0-9_$.])(get|post|put|patch|del|delete)\s*(?:<[^>\n]*>)?\s*\(\s*([`\'"])([^`\'"\n]+)\2',
    re.I,
)
REQUEST_CALL_RE = re.compile(
    r'([A-Za-z0-9_$.]+)\.request\s*(?:<[^>\n]*>)?\s*\(\s*\{(.+?)\}\s*\)',
    re.I | re.S,
)
REQUEST_URL_RE = re.compile(r'url\s*:\s*([`\'"])([^`\'"\n]+)\1', re.I)
REQUEST_METHOD_RE = re.compile(r'method\s*:\s*([`\'"])(GET|POST|PUT|PATCH|DELETE)\1', re.I)
FETCH_CALL_RE = re.compile(r'fetch\s*\(\s*([`\'"])([^`\'"\n]+)\1', re.I)
FETCH_METHOD_RE = re.compile(r'method\s*:\s*["\'](GET|POST|PUT|PATCH|DELETE)["\']', re.I)

MSW_ROUTE_RE = re.compile(r'http\.(get|post|put|patch|delete)\(\s*([`\'"])([^`\'"]+)\2', re.I)


def join_path(base: str, sub: str) -> str:
    base = (base or "").strip()
    sub = (sub or "").strip()
    if not sub:
        path = base
    elif sub.startswith("/"):
        path = base.rstrip("/") + sub if base else sub
    else:
        path = base.rstrip("/") + "/" + sub if base else "/" + sub
    if not path.startswith("/"):
        path = "/" + path
    path = re.sub(r"/+", "/", path)
    if len(path) > 1 and path.endswith("/"):
        path = path[:-1]
    return path


def backend_path_to_regex(path: str) -> str:
    escaped = re.escape(path)
    escaped = re.sub(r":[A-Za-z_][A-Za-z0-9_]*", r"[^/]+", escaped)
    escaped = re.sub(r"\\\*[A-Za-z_][A-Za-z0-9_]*", r".+", escaped)
    return "^" + escaped + "$"


def normalize_front_path(raw: str, base: str) -> Optional[str]:
    value = raw.strip()
    if not value:
        return None
    if value.startswith("http://") or value.startswith("https://"):
        return None
    if value.startswith(
        (
            "/api/v1",
            "/api/provider",
            "/v1",
            "/v1beta",
            "/v1internal",
            "/responses",
            "/antigravity",
            "/health",
            "/setup",
        )
    ):
        full = value
    elif value.startswith("/"):
        full = join_path(base, value)
    else:
        full = join_path(base, "/" + value)
    return re.sub(r"/+", "/", full)


def front_path_to_matchable(path: str) -> str:
    stripped = path.split("?", 1)[0]
    stripped = re.sub(r"\$\{[^}]+\}", "X", stripped)
    stripped = re.sub(r":[A-Za-z_][A-Za-z0-9_]*", "X", stripped)
    return stripped


def parse_backend_routes(repo_root: Path) -> List[Route]:
    backend_files = [
        repo_root / "backend/internal/server/routes/common.go",
        repo_root / "backend/internal/server/routes/auth.go",
        repo_root / "backend/internal/server/routes/user.go",
        repo_root / "backend/internal/server/routes/payment.go",
        repo_root / "backend/internal/server/routes/admin.go",
        repo_root / "backend/internal/server/routes/gateway.go",
        repo_root / "backend/internal/setup/handler.go",
    ]
    seed_prefixes: Dict[str, Dict[str, str]] = {
        "common.go": {"r": ""},
        "gateway.go": {"r": ""},
        "auth.go": {"v1": "/api/v1"},
        "user.go": {"v1": "/api/v1"},
        "payment.go": {"v1": "/api/v1"},
        "admin.go": {"v1": "/api/v1", "admin": "/api/v1/admin"},
        "handler.go": {"r": ""},
    }

    routes: List[Route] = []
    for backend_file in backend_files:
        lines = backend_file.read_text(encoding="utf-8", errors="ignore").splitlines()
        prefixes = dict(seed_prefixes.get(backend_file.name, {}))
        if backend_file.name == "admin.go":
            prefixes["admin"] = "/api/v1/admin"

        for line_no, line in enumerate(lines, start=1):
            group_match = GROUP_ASSIGN_RE.search(line)
            if group_match:
                var_name, parent_var, group_path = group_match.groups()
                if parent_var in prefixes:
                    prefixes[var_name] = join_path(prefixes[parent_var], group_path)

            route_match = ROUTE_CALL_RE.search(line)
            if route_match:
                var_name, method, route_path = route_match.groups()
                if var_name in prefixes:
                    routes.append(
                        Route(
                            method=method.upper(),
                            path=join_path(prefixes[var_name], route_path),
                            file=str(backend_file.relative_to(repo_root)).replace("\\", "/"),
                            line=line_no,
                        )
                    )

    seen: set[Tuple[str, str]] = set()
    unique: List[Route] = []
    for route in routes:
        key = (route.method, route.path)
        if key in seen:
            continue
        seen.add(key)
        unique.append(route)
    return unique


def iter_source_files(repo_root: Path, globs: Iterable[str], include_mocks: bool) -> Iterable[Path]:
    discovered: List[Path] = []
    for pattern in globs:
        discovered.extend(repo_root.glob(pattern))
    for path in sorted(set(discovered)):
        if not path.is_file():
            continue
        rel = str(path.relative_to(repo_root)).replace("\\", "/")
        if any(token in rel for token in ("/node_modules/", "/dist/", "/__tests__/")):
            continue
        if "/mocks/" in rel and not include_mocks:
            continue
        yield path


def parse_runtime_calls(repo_root: Path) -> Dict[str, List[CallSite]]:
    projects = {
        "frontend": {"base": "/api/v1", "globs": ["frontend/src/api/**/*.ts"]},
        "web-app-v": {"base": "/api/v1", "globs": ["web-app-v/src/api/**/*.ts"]},
        "web-app": {
            "base": "/api/v1",
            "globs": [
                "web-app/src/shared/api/**/*.ts",
                "web-app/src/entities/**/api/**/*.ts",
            ],
        },
        "new": {
            "base": "/api/v1",
            "globs": ["new/services/**/*.ts", "new/services/*.ts"],
        },
    }

    calls: Dict[str, List[CallSite]] = defaultdict(list)
    for project_name, config in projects.items():
        for file_path in iter_source_files(repo_root, config["globs"], include_mocks=False):
            rel_file = str(file_path.relative_to(repo_root)).replace("\\", "/")
            content = file_path.read_text(encoding="utf-8", errors="ignore")

            for match in METHOD_CALL_RE.finditer(content):
                receiver, method, _, raw_path = match.groups()
                full_path = normalize_front_path(raw_path, config["base"])
                if not full_path:
                    continue
                calls[project_name].append(
                    CallSite(
                        project=project_name,
                        method=method.upper(),
                        raw_path=raw_path,
                        full_path=full_path,
                        file=rel_file,
                        line=content.count("\n", 0, match.start()) + 1,
                        receiver=receiver,
                    )
                )

            for match in FUNCTION_CALL_RE.finditer(content):
                function_name, _, raw_path = match.groups()
                method = function_name.upper()
                if method == "DEL":
                    method = "DELETE"
                full_path = normalize_front_path(raw_path, config["base"])
                if not full_path:
                    continue
                calls[project_name].append(
                    CallSite(
                        project=project_name,
                        method=method,
                        raw_path=raw_path,
                        full_path=full_path,
                        file=rel_file,
                        line=content.count("\n", 0, match.start()) + 1,
                        receiver=function_name,
                    )
                )

            for match in REQUEST_CALL_RE.finditer(content):
                receiver, payload = match.groups()
                url_match = REQUEST_URL_RE.search(payload)
                if not url_match:
                    continue
                method_match = REQUEST_METHOD_RE.search(payload)
                method = method_match.group(2).upper() if method_match else "GET"
                raw_path = url_match.group(2)
                full_path = normalize_front_path(raw_path, config["base"])
                if not full_path:
                    continue
                calls[project_name].append(
                    CallSite(
                        project=project_name,
                        method=method,
                        raw_path=raw_path,
                        full_path=full_path,
                        file=rel_file,
                        line=content.count("\n", 0, match.start()) + 1,
                        receiver=receiver,
                    )
                )

            for match in FETCH_CALL_RE.finditer(content):
                raw_path = match.group(2)
                full_path = normalize_front_path(raw_path, config["base"])
                if not full_path:
                    continue
                snippet = content[match.start() : match.start() + 300]
                method_match = FETCH_METHOD_RE.search(snippet)
                method = method_match.group(1).upper() if method_match else "GET"
                calls[project_name].append(
                    CallSite(
                        project=project_name,
                        method=method,
                        raw_path=raw_path,
                        full_path=full_path,
                        file=rel_file,
                        line=content.count("\n", 0, match.start()) + 1,
                        receiver="fetch",
                    )
                )

    deduped: Dict[str, List[CallSite]] = {}
    for project_name, entries in calls.items():
        seen = set()
        unique: List[CallSite] = []
        for entry in entries:
            key = (entry.file, entry.line, entry.method, entry.full_path)
            if key in seen:
                continue
            seen.add(key)
            unique.append(entry)
        deduped[project_name] = unique
    return deduped


def parse_mock_routes(repo_root: Path) -> List[CallSite]:
    handlers_file = repo_root / "web-app-v/src/mocks/handlers.ts"
    if not handlers_file.exists():
        return []
    content = handlers_file.read_text(encoding="utf-8", errors="ignore")
    rel_file = str(handlers_file.relative_to(repo_root)).replace("\\", "/")

    mock_calls: List[CallSite] = []
    for match in MSW_ROUTE_RE.finditer(content):
        method, _, raw_path = match.groups()
        mock_calls.append(
            CallSite(
                project="web-app-v-mock",
                method=method.upper(),
                raw_path=raw_path,
                full_path=raw_path,
                file=rel_file,
                line=content.count("\n", 0, match.start()) + 1,
                receiver="http",
            )
        )
    return mock_calls


def audit_calls(
    backend_routes: List[Route],
    project_calls: Dict[str, List[CallSite]],
) -> Dict[str, List[dict]]:
    by_method: Dict[str, List[Tuple[Route, re.Pattern[str]]]] = defaultdict(list)
    for route in backend_routes:
        by_method[route.method].append((route, re.compile(backend_path_to_regex(route.path))))

    mismatches: Dict[str, List[dict]] = defaultdict(list)

    for project_name, calls in project_calls.items():
        for call in calls:
            target = front_path_to_matchable(call.full_path)

            matched = False
            for route, pattern in by_method.get(call.method, []):
                if pattern.match(target):
                    matched = True
                    break
            if matched:
                continue

            method_candidates = set()
            for backend_method, method_routes in by_method.items():
                for _, pattern in method_routes:
                    if pattern.match(target):
                        method_candidates.add(backend_method)
            entry = {
                "kind": "method_mismatch" if method_candidates else "route_missing",
                "method": call.method,
                "full_path": call.full_path,
                "raw_path": call.raw_path,
                "file": call.file,
                "line": call.line,
                "receiver": call.receiver,
            }
            if method_candidates:
                entry["backend_methods"] = sorted(method_candidates)
            mismatches[project_name].append(entry)

    return mismatches


def build_output(
    backend_routes: List[Route],
    project_calls: Dict[str, List[CallSite]],
    mismatches: Dict[str, List[dict]],
) -> dict:
    return {
        "backend_count": len(backend_routes),
        "frontend_call_count": {project: len(calls) for project, calls in project_calls.items()},
        "mismatch_count": {project: len(items) for project, items in mismatches.items()},
        "mismatches": mismatches,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit frontend/backend API contract alignment.")
    parser.add_argument(
        "--repo-root",
        default=".",
        help="Repository root path (default: current directory).",
    )
    parser.add_argument(
        "--output",
        default=".context-snapshots/api_alignment_audit.json",
        help="Output JSON path relative to repo root.",
    )
    parser.add_argument(
        "--include-mocks",
        action="store_true",
        help="Include web-app-v mock handlers in audit scope.",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Exit with code 1 when mismatches exist.",
    )
    args = parser.parse_args()

    repo_root = Path(args.repo_root).resolve()
    backend_routes = parse_backend_routes(repo_root)
    calls = parse_runtime_calls(repo_root)

    if args.include_mocks:
        calls["web-app-v-mock"] = parse_mock_routes(repo_root)

    mismatches = audit_calls(backend_routes, calls)
    output = build_output(backend_routes, calls, mismatches)

    output_path = (repo_root / args.output).resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")

    summary = {
        "backend_count": output["backend_count"],
        "frontend_call_count": output["frontend_call_count"],
        "mismatch_count": output["mismatch_count"],
        "output": str(output_path.relative_to(repo_root)).replace("\\", "/"),
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))

    has_mismatch = any(count > 0 for count in output["mismatch_count"].values())
    if args.strict and has_mismatch:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
