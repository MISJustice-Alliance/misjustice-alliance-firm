#!/usr/bin/env python3
"""
MISJustice Alliance - Metadata Validation Script
=================================================
Validates case-metadata.json files against required schema
before migration to platform-ready format.

Usage:
    python validate-metadata.py <path-to-case-metadata.json>
    python validate-metadata.py --all  # Validate all cases

Author: MISJustice Alliance Archive Migration
Created: 2026-01-01
"""

import json
import sys
from pathlib import Path
from typing import Dict, List, Tuple
from datetime import datetime


# Required fields for case metadata
REQUIRED_CASE_FIELDS = [
    "case_id",
    "title",
    "description",
    "status",
    "jurisdiction",
    "case_type",
    "date_filed",
    "plaintiff_name",
    "defendant_name",
    "outcome",
]

# Optional but recommended fields
RECOMMENDED_FIELDS = [
    "damages_claimed",
    "tags",
    "related_cases",
    "narrative_documents",
    "evidence_documents",
    "metadata",
]

# Valid status values
VALID_STATUSES = ["open", "closed", "dismissed", "appealed", "settled", "pending"]


class ValidationResult:
    """Results of metadata validation"""

    def __init__(self, file_path: str):
        self.file_path = file_path
        self.errors: List[str] = []
        self.warnings: List[str] = []
        self.info: List[str] = []

    def add_error(self, message: str):
        """Add validation error"""
        self.errors.append(f"ERROR: {message}")

    def add_warning(self, message: str):
        """Add validation warning"""
        self.warnings.append(f"WARNING: {message}")

    def add_info(self, message: str):
        """Add informational message"""
        self.info.append(f"INFO: {message}")

    def is_valid(self) -> bool:
        """Check if validation passed (no errors)"""
        return len(self.errors) == 0

    def print_report(self):
        """Print validation report"""
        print(f"\n{'=' * 80}")
        print(f"Validation Report: {Path(self.file_path).name}")
        print(f"{'=' * 80}\n")

        if self.errors:
            print("ERRORS:")
            for error in self.errors:
                print(f"  ❌ {error}")
            print()

        if self.warnings:
            print("WARNINGS:")
            for warning in self.warnings:
                print(f"  ⚠️  {warning}")
            print()

        if self.info:
            print("INFO:")
            for info in self.info:
                print(f"  ℹ️  {info}")
            print()

        if self.is_valid():
            print("✅ Validation PASSED")
        else:
            print(f"❌ Validation FAILED ({len(self.errors)} errors)")

        print(f"\n{'=' * 80}\n")


def validate_case_metadata(file_path: str) -> ValidationResult:
    """
    Validate a case-metadata.json file

    Args:
        file_path: Path to case-metadata.json file

    Returns:
        ValidationResult with errors, warnings, and info
    """
    result = ValidationResult(file_path)

    # Check file exists
    if not Path(file_path).exists():
        result.add_error(f"File not found: {file_path}")
        return result

    # Load JSON
    try:
        with open(file_path, "r") as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        result.add_error(f"Invalid JSON: {e}")
        return result
    except Exception as e:
        result.add_error(f"Failed to read file: {e}")
        return result

    # Validate required fields
    for field in REQUIRED_CASE_FIELDS:
        if field not in data:
            result.add_error(f"Missing required field: '{field}'")
        elif not data[field]:
            result.add_warning(f"Required field is empty: '{field}'")

    # Check recommended fields
    for field in RECOMMENDED_FIELDS:
        if field not in data:
            result.add_warning(f"Missing recommended field: '{field}'")

    # Validate status
    if "status" in data:
        if data["status"] not in VALID_STATUSES:
            result.add_error(
                f"Invalid status: '{data['status']}'. Must be one of: {VALID_STATUSES}"
            )

    # Validate date_filed format
    if "date_filed" in data:
        try:
            datetime.strptime(data["date_filed"], "%Y-%m-%d")
        except ValueError:
            result.add_error(
                f"Invalid date_filed format: '{data['date_filed']}'. Expected YYYY-MM-DD"
            )

    # Validate damages_claimed is numeric
    if "damages_claimed" in data:
        if not isinstance(data["damages_claimed"], (int, float)):
            result.add_error(
                f"damages_claimed must be numeric, got: {type(data['damages_claimed'])}"
            )

    # Check narrative_documents structure
    if "narrative_documents" in data:
        if isinstance(data["narrative_documents"], list):
            for idx, doc in enumerate(data["narrative_documents"]):
                if not isinstance(doc, dict):
                    result.add_error(
                        f"narrative_documents[{idx}] must be an object, got: {type(doc)}"
                    )
                    continue

                # Check required document fields
                for field in ["filename", "file_type", "category", "source_path"]:
                    if field not in doc:
                        result.add_error(
                            f"narrative_documents[{idx}] missing field: '{field}'"
                        )

                # Verify source file exists
                if "source_path" in doc:
                    source_path = Path(file_path).parent / doc["source_path"]
                    if not source_path.exists():
                        result.add_warning(
                            f"Source file not found: {doc['source_path']}"
                        )
        else:
            result.add_error(
                "narrative_documents must be an array"
            )

    # Platform import readiness
    if "platform_import" in data:
        if "ready_for_import" in data["platform_import"]:
            if data["platform_import"]["ready_for_import"]:
                result.add_info("Case marked as ready for platform import")
            else:
                result.add_info("Case NOT yet ready for platform import")

    # Arweave archival priority
    if "arweave_archival" in data:
        priority = data["arweave_archival"].get("archival_priority", "unknown")
        result.add_info(f"Arweave archival priority: {priority}")

    # Document counts
    doc_count = len(data.get("narrative_documents", []))
    evidence_count = len(data.get("evidence_documents", []))
    result.add_info(f"Documents: {doc_count} narrative, {evidence_count} evidence categories")

    return result


def validate_all_cases(base_dir: str = ".") -> Tuple[int, int]:
    """
    Validate all case-metadata.json files

    Args:
        base_dir: Base directory to search for cases

    Returns:
        Tuple of (passed_count, failed_count)
    """
    base_path = Path(base_dir)
    source_materials = base_path / "01-source-materials"

    if not source_materials.exists():
        print(f"ERROR: Directory not found: {source_materials}")
        return 0, 0

    # Find all case-metadata.json files
    metadata_files = list(source_materials.glob("*/case-metadata.json"))

    if not metadata_files:
        print(f"WARNING: No case-metadata.json files found in {source_materials}")
        return 0, 0

    print(f"\nFound {len(metadata_files)} case(s) to validate\n")

    passed = 0
    failed = 0

    for metadata_file in metadata_files:
        result = validate_case_metadata(str(metadata_file))
        result.print_report()

        if result.is_valid():
            passed += 1
        else:
            failed += 1

    # Summary
    print(f"{'=' * 80}")
    print(f"SUMMARY: {passed} passed, {failed} failed")
    print(f"{'=' * 80}\n")

    return passed, failed


def main():
    """Main entry point"""
    if len(sys.argv) < 2:
        print("Usage: python validate-metadata.py <path-to-case-metadata.json>")
        print("       python validate-metadata.py --all")
        sys.exit(1)

    if sys.argv[1] == "--all":
        passed, failed = validate_all_cases()
        sys.exit(0 if failed == 0 else 1)
    else:
        file_path = sys.argv[1]
        result = validate_case_metadata(file_path)
        result.print_report()
        sys.exit(0 if result.is_valid() else 1)


if __name__ == "__main__":
    main()
