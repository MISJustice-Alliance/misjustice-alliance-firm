#!/usr/bin/env bash

################################################################################
# LaTeX to Markdown Batch Converter (Bash 3.x+ Compatible)
# ==========================================================
# Converts all .tex files in a directory to .md format using Pandoc.
#
# Requirements:
#     - Bash 3.0+ (compatible with older systems)
#     - Pandoc installed and in PATH
#
# Usage:
#     bash latex_to_markdown.sh [input_dir] [output_dir] [options]
#
#     If no arguments provided:
#         - Input: Current directory (*.tex files)
#         - Output: ./markdown/ subdirectory
#
# Options:
#     -s, --standalone    Produce standalone documents
#     -t, --toc          Include table of contents
#     -m, --media        Extract media files
#     -h, --help         Show this help message
#
# Author: MISJustice Alliance
# Date: December 10, 2025
# Version: 1.1 (Bash 3.x compatible)
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
INPUT_DIR="../docs/latex/"
OUTPUT_DIR="../docs/"
STANDALONE=false
TOC=false
EXTRACT_MEDIA=false

# Print colored message
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Help message
show_help() {
    cat << EOF
LaTeX to Markdown Batch Converter

Usage: bash $0 [input_dir] [output_dir] [options]

Arguments:
    input_dir       Input directory containing .tex files (default: current directory)
    output_dir      Output directory for .md files (default: ./markdown/)

Options:
    -s, --standalone    Produce standalone documents with headers
    -t, --toc          Include table of contents
    -m, --media        Extract media files to ./media/ subdirectory
    -h, --help         Show this help message

Examples:
    # Convert all .tex files in current directory
    bash $0

    # Convert files from specific input directory
    bash $0 /path/to/tex/files

    # Specify both input and output directories
    bash $0 ./tex ./markdown

    # With standalone headers and table of contents
    bash $0 . ./markdown --standalone --toc

Note: Use 'bash' explicitly to ensure compatibility

EOF
    exit 0
}

# Check if Pandoc is installed
check_pandoc() {
    if ! command -v pandoc &> /dev/null; then
        print_error "Pandoc not found in PATH"
        echo "  Install from: https://pandoc.org/installing.html"
        exit 1
    fi

    PANDOC_VERSION=$(pandoc --version | head -n 1)
    print_success "Pandoc found: $PANDOC_VERSION"
}

# Parse command-line arguments
parse_args() {
    local positional_count=0

    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                ;;
            -s|--standalone)
                STANDALONE=true
                shift
                ;;
            -t|--toc)
                TOC=true
                shift
                ;;
            -m|--media)
                EXTRACT_MEDIA=true
                shift
                ;;
            -*)
                print_error "Unknown option: $1"
                echo "Use -h or --help for usage information"
                exit 1
                ;;
            *)
                if [ $positional_count -eq 0 ]; then
                    INPUT_DIR="$1"
                    positional_count=$((positional_count + 1))
                elif [ $positional_count -eq 1 ]; then
                    OUTPUT_DIR="$1"
                    positional_count=$((positional_count + 1))
                fi
                shift
                ;;
        esac
    done

    # Set default output directory if not specified
    if [ -z "$OUTPUT_DIR" ]; then
        OUTPUT_DIR="$INPUT_DIR/markdown"
    fi
}

# Convert a single file
convert_file() {
    local input_file="$1"
    local output_dir="$2"
    local filename=$(basename "$input_file" .tex)
    local output_file="$output_dir/${filename}.md"

    # Build Pandoc command
    local cmd="pandoc"
    cmd="$cmd \"$input_file\""
    cmd="$cmd -f latex"
    cmd="$cmd -t markdown"
    cmd="$cmd -o \"$output_file\""
    cmd="$cmd --wrap=none"

    # Add optional flags
    if [ "$STANDALONE" = true ]; then
        cmd="$cmd -s"
    fi

    if [ "$TOC" = true ]; then
        cmd="$cmd --toc"
    fi

    if [ "$EXTRACT_MEDIA" = true ]; then
        local media_dir="$output_dir/media"
        mkdir -p "$media_dir"
        cmd="$cmd --extract-media=\"$media_dir\""
    fi

    # Execute conversion
    if eval $cmd 2>/dev/null; then
        print_success "Converted: $(basename "$input_file") → $(basename "$output_file")"
        return 0
    else
        print_error "Failed: $(basename "$input_file")"
        return 1
    fi
}

# Main function
main() {
    # Print header
    echo "================================================================================"
    echo "LaTeX to Markdown Batch Converter (Bash 3.x+ Compatible)"
    echo "================================================================================"

    # Check for Pandoc
    check_pandoc

    # Setup directories
    if [ ! -d "$INPUT_DIR" ]; then
        print_error "Input directory does not exist: $INPUT_DIR"
        exit 1
    fi

    # Create output directory
    mkdir -p "$OUTPUT_DIR"

    # Convert to absolute paths
    INPUT_DIR=$(cd "$INPUT_DIR" && pwd)
    OUTPUT_DIR=$(cd "$OUTPUT_DIR" && pwd)

    echo ""
    print_info "Input directory:  $INPUT_DIR"
    print_info "Output directory: $OUTPUT_DIR"

    # Find .tex files (Bash 3.x compatible method)
    # Instead of mapfile, use a while loop with array
    TEX_FILES=()
    while IFS= read -r -d '' file; do
        TEX_FILES+=("$file")
    done < <(find "$INPUT_DIR" -maxdepth 1 -name "*.tex" -type f -print0)

    # Alternative method if above doesn't work (even more compatible)
    if [ ${#TEX_FILES[@]} -eq 0 ]; then
        # Fallback: simpler method without null delimiter
        OLD_IFS="$IFS"
        IFS=$'\n'
        TEX_FILES=($(find "$INPUT_DIR" -maxdepth 1 -name "*.tex" -type f))
        IFS="$OLD_IFS"
    fi

    if [ ${#TEX_FILES[@]} -eq 0 ]; then
        print_error "No .tex files found in $INPUT_DIR"
        exit 1
    fi

    echo ""
    print_success "Found ${#TEX_FILES[@]} .tex file(s):"
    for file in "${TEX_FILES[@]}"; do
        echo "  - $(basename "$file")"
    done

    # Convert files
    echo ""
    echo "================================================================================"
    echo "Converting files..."
    echo "================================================================================"
    echo ""

    SUCCESS_COUNT=0
    FAIL_COUNT=0

    for tex_file in "${TEX_FILES[@]}"; do
        if convert_file "$tex_file" "$OUTPUT_DIR"; then
            SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        else
            FAIL_COUNT=$((FAIL_COUNT + 1))
        fi
    done

    # Summary
    echo ""
    echo "================================================================================"
    echo "Conversion Summary"
    echo "================================================================================"
    print_success "Successful: $SUCCESS_COUNT"
    if [ $FAIL_COUNT -gt 0 ]; then
        print_error "Failed:     $FAIL_COUNT"
    fi
    echo "📊 Total:      ${#TEX_FILES[@]}"
    echo ""
    print_info "Output location: $OUTPUT_DIR"
    echo "================================================================================"

    # Exit with appropriate code
    if [ $FAIL_COUNT -gt 0 ]; then
        exit 1
    else
        exit 0
    fi
}

# Parse arguments
parse_args "$@"

# Run main function
main
