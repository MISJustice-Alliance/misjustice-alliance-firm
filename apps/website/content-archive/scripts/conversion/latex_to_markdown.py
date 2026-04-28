#!/usr/bin/env python3
"""
LaTeX to Markdown Batch Converter
==================================
Converts all .tex files in a directory to .md format using Pandoc.

Requirements:
    - Python 3.6+
    - Pandoc installed and in PATH

Usage:
    python latex_to_markdown.py [input_dir] [output_dir]

    If no arguments provided:
        - Input: Current directory (*.tex files)
        - Output: ./markdown/ subdirectory

Author: MISJustice Alliance
Date: December 10, 2025
"""

import os
import sys
import subprocess
import argparse
from pathlib import Path
from typing import List, Tuple


def check_pandoc() -> bool:
    """Check if Pandoc is installed and accessible."""
    try:
        result = subprocess.run(
            ['pandoc', '--version'],
            capture_output=True,
            text=True,
            check=True
        )
        version = result.stdout.split('\n')[0]
        print(f"✓ Pandoc found: {version}")
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("✗ ERROR: Pandoc not found in PATH")
        print("  Install from: https://pandoc.org/installing.html")
        return False


def find_tex_files(directory: Path) -> List[Path]:
    """Find all .tex files in the specified directory."""
    tex_files = list(directory.glob('*.tex'))

    if not tex_files:
        print(f"✗ No .tex files found in {directory}")
        return []

    print(f"\n✓ Found {len(tex_files)} .tex file(s):")
    for tex_file in tex_files:
        print(f"  - {tex_file.name}")

    return tex_files


def convert_file(
    input_file: Path,
    output_dir: Path,
    options: dict
) -> Tuple[bool, str]:
    """
    Convert a single LaTeX file to Markdown using Pandoc.

    Args:
        input_file: Path to .tex file
        output_dir: Directory for output .md file
        options: Conversion options dictionary

    Returns:
        Tuple of (success: bool, message: str)
    """
    # Create output filename
    output_file = output_dir / f"{input_file.stem}.md"

    # Build Pandoc command
    cmd = [
        'pandoc',
        str(input_file),
        '-f', 'latex',
        '-t', 'markdown',
        '-o', str(output_file),
        '--wrap=none',  # Don't wrap lines
    ]

    # Add optional flags
    if options.get('standalone'):
        cmd.append('-s')

    if options.get('extract_media'):
        media_dir = output_dir / 'media'
        media_dir.mkdir(exist_ok=True)
        cmd.extend(['--extract-media', str(media_dir)])

    if options.get('toc'):
        cmd.append('--toc')

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True
        )
        return True, f"✓ Converted: {input_file.name} → {output_file.name}"

    except subprocess.CalledProcessError as e:
        error_msg = f"✗ Failed: {input_file.name}"
        if e.stderr:
            error_msg += f"\n  Error: {e.stderr.strip()}"
        return False, error_msg


def main():
    """Main execution function."""
    # Parse command-line arguments
    parser = argparse.ArgumentParser(
        description='Batch convert LaTeX files to Markdown using Pandoc',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  # Convert all .tex files in current directory
  python latex_to_markdown.py

  # Convert files from specific input directory
  python latex_to_markdown.py /path/to/tex/files

  # Specify both input and output directories
  python latex_to_markdown.py ./tex ./markdown

  # With standalone headers and table of contents
  python latex_to_markdown.py --standalone --toc
        '''
    )

    parser.add_argument(
        'input_dir',
        nargs='?',
        default='.',
        help='Input directory containing .tex files (default: current directory)'
    )

    parser.add_argument(
        'output_dir',
        nargs='?',
        default=None,
        help='Output directory for .md files (default: ./markdown/)'
    )

    parser.add_argument(
        '-s', '--standalone',
        action='store_true',
        help='Produce standalone documents with headers'
    )

    parser.add_argument(
        '-t', '--toc',
        action='store_true',
        help='Include table of contents'
    )

    parser.add_argument(
        '-m', '--extract-media',
        action='store_true',
        help='Extract media files to ./media/ subdirectory'
    )

    parser.add_argument(
        '-v', '--verbose',
        action='store_true',
        help='Verbose output'
    )

    args = parser.parse_args()

    # Print header
    print("=" * 80)
    print("LaTeX to Markdown Batch Converter")
    print("=" * 80)

    # Check for Pandoc
    if not check_pandoc():
        sys.exit(1)

    # Setup directories
    input_dir = Path(args.input_dir).resolve()

    if not input_dir.exists():
        print(f"✗ ERROR: Input directory does not exist: {input_dir}")
        sys.exit(1)

    if args.output_dir:
        output_dir = Path(args.output_dir).resolve()
    else:
        output_dir = input_dir / 'markdown'

    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n📁 Input directory:  {input_dir}")
    print(f"📁 Output directory: {output_dir}")

    # Find .tex files
    tex_files = find_tex_files(input_dir)

    if not tex_files:
        sys.exit(1)

    # Conversion options
    options = {
        'standalone': args.standalone,
        'toc': args.toc,
        'extract_media': args.extract_media,
        'verbose': args.verbose
    }

    # Convert files
    print("\n" + "=" * 80)
    print("Converting files...")
    print("=" * 80 + "\n")

    success_count = 0
    fail_count = 0

    for tex_file in tex_files:
        success, message = convert_file(tex_file, output_dir, options)
        print(message)

        if success:
            success_count += 1
        else:
            fail_count += 1

    # Summary
    print("\n" + "=" * 80)
    print("Conversion Summary")
    print("=" * 80)
    print(f"✓ Successful: {success_count}")
    print(f"✗ Failed:     {fail_count}")
    print(f"📊 Total:      {len(tex_files)}")
    print(f"\n📁 Output location: {output_dir}")
    print("=" * 80)

    sys.exit(0 if fail_count == 0 else 1)


if __name__ == '__main__':
    main()
