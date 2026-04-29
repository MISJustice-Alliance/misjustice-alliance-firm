#!/usr/bin/env python3
"""
MISJustice Alliance - Platform-Ready JSON Generator
===================================================
Transforms case-metadata.json files into platform-ready JSON format
that matches the PostgreSQL Cases table schema.

Usage:
    python generate-case-json.py <path-to-case-metadata.json> [output-file]
    python generate-case-json.py --all  # Process all cases

Author: MISJustice Alliance Archive Migration
Created: 2026-01-01
"""

import json
import sys
from pathlib import Path
from typing import Dict, Any


def transform_to_platform_ready(metadata: Dict[str, Any]) -> Dict[str, Any]:
    """
    Transform case-metadata.json to platform-ready format

    Args:
        metadata: Raw case metadata dictionary

    Returns:
        Platform-ready JSON structure
    """
    # Extract core case data (matches PostgreSQL Cases table)
    case_data = {
        "title": metadata.get("title", ""),
        "description": metadata.get("description", ""),
        "status": metadata.get("status", "open"),
        "jurisdiction": metadata.get("jurisdiction", ""),
        "case_type": metadata.get("case_type", ""),
        "date_filed": metadata.get("date_filed", ""),
        "plaintiff_name": metadata.get("plaintiff_name", ""),
        "defendant_name": metadata.get("defendant_name", ""),
        "outcome": metadata.get("outcome", ""),
        "notes": metadata.get("notes", ""),
    }

    # Extended metadata (not in core PostgreSQL schema)
    extended_metadata = {
        "case_number": metadata.get("case_number", ""),
        "damages_claimed": metadata.get("damages_claimed", 0),
        "tags": metadata.get("tags", []),
        "related_cases": metadata.get("related_cases", []),
    }

    # Add all metadata fields if present
    if "metadata" in metadata:
        extended_metadata.update(metadata["metadata"])

    # Documents manifest
    documents_manifest = metadata.get("narrative_documents", [])

    # Evidence categories
    evidence_categories = metadata.get("evidence_documents", [])

    # Arweave archival settings
    arweave_archival = metadata.get("arweave_archival", {
        "archival_priority": "medium",
        "permanent_preservation_required": True,
        "redaction_required": False,
        "public_visibility": True,
        "archival_bundle_size_estimate_mb": 100
    })

    # Import metadata
    import_metadata = {
        "version": metadata.get("version", "1.0.0"),
        "created_date": metadata.get("created_date", ""),
        "last_updated": metadata.get("last_updated", ""),
        "created_by": metadata.get("created_by", "MISJustice Alliance Archive Migration"),
        "validation_status": metadata.get("validation_status", "pending"),
        "import_ready": True
    }

    # Assemble platform-ready structure
    platform_ready = {
        "case": case_data,
        "extended_metadata": extended_metadata,
        "documents_manifest": documents_manifest,
        "evidence_categories": evidence_categories,
        "arweave_archival": arweave_archival,
        "import_metadata": import_metadata
    }

    return platform_ready


def generate_platform_json(input_file: str, output_file: str = None) -> str:
    """
    Generate platform-ready JSON from case-metadata.json

    Args:
        input_file: Path to case-metadata.json
        output_file: Optional output path (defaults to 02-platform-ready/cases/)

    Returns:
        Path to generated file
    """
    # Load input
    input_path = Path(input_file)
    if not input_path.exists():
        raise FileNotFoundError(f"Input file not found: {input_file}")

    with open(input_path, "r") as f:
        metadata = json.load(f)

    # Transform to platform-ready
    platform_ready = transform_to_platform_ready(metadata)

    # Determine output path
    if output_file is None:
        # Default: 02-platform-ready/cases/{case_id}.json
        case_id = metadata.get("case_id", "unknown")
        case_number = metadata.get("case_number", case_id)
        output_file = f"02-platform-ready/cases/{case_id}-{case_number.lower().replace(' ', '-')}.json"

    output_path = Path(output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Write output
    with open(output_path, "w") as f:
        json.dump(platform_ready, f, indent=2, ensure_ascii=False)

    print(f"✅ Generated: {output_path}")
    print(f"   Case: {metadata.get('title', 'Unknown')}")
    print(f"   Documents: {len(platform_ready['documents_manifest'])}")
    print(f"   Evidence Categories: {len(platform_ready['evidence_categories'])}")

    return str(output_path)


def generate_all_cases(base_dir: str = "."):
    """
    Generate platform-ready JSON for all cases

    Args:
        base_dir: Base directory containing 01-source-materials/
    """
    base_path = Path(base_dir)
    source_materials = base_path / "01-source-materials"

    if not source_materials.exists():
        print(f"ERROR: Directory not found: {source_materials}")
        return

    # Find all case-metadata.json files
    metadata_files = list(source_materials.glob("*/case-metadata.json"))

    if not metadata_files:
        print(f"WARNING: No case-metadata.json files found in {source_materials}")
        return

    print(f"\nGenerating platform-ready JSON for {len(metadata_files)} case(s)...\n")

    for metadata_file in metadata_files:
        try:
            generate_platform_json(str(metadata_file))
            print()
        except Exception as e:
            print(f"❌ Error processing {metadata_file}: {e}\n")


def main():
    """Main entry point"""
    if len(sys.argv) < 2:
        print("Usage: python generate-case-json.py <path-to-case-metadata.json> [output-file]")
        print("       python generate-case-json.py --all")
        sys.exit(1)

    if sys.argv[1] == "--all":
        generate_all_cases()
    else:
        input_file = sys.argv[1]
        output_file = sys.argv[2] if len(sys.argv) > 2 else None
        try:
            generate_platform_json(input_file, output_file)
        except Exception as e:
            print(f"ERROR: {e}")
            sys.exit(1)


if __name__ == "__main__":
    main()
