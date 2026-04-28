# LaTeX to Markdown Batch Converter

Batch convert LaTeX (`.tex`) files to Markdown (`.md`) format using Pandoc.

**Available in two versions:**
- **Python script** (`latex_to_markdown.py`) - Cross-platform, feature-rich
- **Bash script** (`latex_to_markdown.sh`) - Unix/Linux/Mac, lightweight

---

## Requirements

### Both Scripts
- **Pandoc** installed and in PATH
  - Install: https://pandoc.org/installing.html
  - Verify: `pandoc --version`

### Python Script Only
- Python 3.6 or higher

### Bash Script Only
- Bash 4.0 or higher (standard on most Unix systems)

---

## Installation

### Python Script
```bash
# Download the script
wget https://example.com/latex_to_markdown.py
# or
curl -O https://example.com/latex_to_markdown.py

# Make executable (optional)
chmod +x latex_to_markdown.py
```

### Bash Script
```bash
# Download the script
wget https://example.com/latex_to_markdown.sh
# or
curl -O https://example.com/latex_to_markdown.sh

# Make executable (required)
chmod +x latex_to_markdown.sh
```

---

## Usage

### Basic Usage (Both Scripts)

**Convert all `.tex` files in current directory:**
```bash
# Python
python latex_to_markdown.py

# Bash
./latex_to_markdown.sh
```

Output: `./markdown/*.md`

### Specify Input Directory

```bash
# Python
python latex_to_markdown.py /path/to/tex/files

# Bash
./latex_to_markdown.sh /path/to/tex/files
```

### Specify Both Input and Output Directories

```bash
# Python
python latex_to_markdown.py ./tex ./markdown

# Bash
./latex_to_markdown.sh ./tex ./markdown
```

### With Options

```bash
# Python - Standalone documents with table of contents
python latex_to_markdown.py --standalone --toc

# Python - Extract media files
python latex_to_markdown.py --extract-media

# Bash - Standalone with TOC
./latex_to_markdown.sh . ./markdown --standalone --toc

# Bash - Extract media
./latex_to_markdown.sh --media
```

---

## Command-Line Options

### Python Script (`latex_to_markdown.py`)

| Option | Short | Description |
|--------|-------|-------------|
| `--standalone` | `-s` | Produce standalone documents with headers |
| `--toc` | `-t` | Include table of contents |
| `--extract-media` | `-m` | Extract media files to `./media/` |
| `--verbose` | `-v` | Verbose output |
| `--help` | `-h` | Show help message |

### Bash Script (`latex_to_markdown.sh`)

| Option | Short | Description |
|--------|-------|-------------|
| `--standalone` | `-s` | Produce standalone documents with headers |
| `--toc` | `-t` | Include table of contents |
| `--media` | `-m` | Extract media files to `./media/` |
| `--help` | `-h` | Show help message |

---

## Examples

### Example 1: Convert Current Directory
```bash
# Python
python latex_to_markdown.py

# Bash
./latex_to_markdown.sh
```

**Result:**
```
./
├── 01_Document.tex
├── 02_Document.tex
└── markdown/
    ├── 01_Document.md
    └── 02_Document.md
```

### Example 2: Specify Directories
```bash
# Python
python latex_to_markdown.py ~/legal-docs/tex ~/legal-docs/markdown

# Bash
./latex_to_markdown.sh ~/legal-docs/tex ~/legal-docs/markdown
```

### Example 3: Full-Featured Conversion
```bash
# Python
python latex_to_markdown.py \
    ./tex \
    ./output \
    --standalone \
    --toc \
    --extract-media \
    --verbose

# Bash
./latex_to_markdown.sh \
    ./tex \
    ./output \
    --standalone \
    --toc \
    --media
```

---

## Output Format

### Default Markdown Output

The scripts convert LaTeX to clean, readable Markdown:

**LaTeX Input:**
```latex
\section*{Introduction}

This is \textbf{bold} text and \textit{italic} text.

\begin{itemize}
\item First item
\item Second item
\end{itemize}
```

**Markdown Output:**
```markdown
## Introduction

This is **bold** text and *italic* text.

- First item
- Second item
```

### Conversion Details

✅ **Converted Elements:**
- Section headers (`\section*` → `##`)
- Subsections (`\subsection*` → `###`)
- Bold text (`\textbf{}` → `**text**`)
- Italic text (`\textit{}` → `*text*`)
- Lists (`\begin{itemize}` → `- item`)
- Special characters (`\$`, `\&`, etc.)

❌ **Removed Elements:**
- LaTeX preamble
- Formatting commands (`\vspace`, etc.)
- Custom headers/footers
- Page breaks

---

## Features Comparison

| Feature | Python Script | Bash Script |
|---------|---------------|-------------|
| Cross-platform | ✅ | ⚠️ Unix only |
| Verbose mode | ✅ | ❌ |
| Error handling | ✅ Advanced | ✅ Basic |
| Colored output | ❌ | ✅ |
| Type hints | ✅ | N/A |
| Argument parsing | ✅ argparse | ✅ getopts |

**Recommendation:**
- **Use Python** for cross-platform compatibility and advanced features
- **Use Bash** for simple, fast conversions on Unix systems

---

## Error Handling

### Common Errors

**1. Pandoc Not Found**
```
✗ ERROR: Pandoc not found in PATH
  Install from: https://pandoc.org/installing.html
```

**Solution:** Install Pandoc and ensure it's in your PATH.

**2. No `.tex` Files Found**
```
✗ No .tex files found in /path/to/directory
```

**Solution:** Check that the input directory contains `.tex` files.

**3. Conversion Failed**
```
✗ Failed: 01_Document.tex
  Error: [Pandoc error message]
```

**Solution:** Check the LaTeX syntax in the failing file. Pandoc may not support all LaTeX packages.

---

## Advanced Usage

### Converting Specific Files Only

**Python:**
```python
# Modify the script to filter files
tex_files = [f for f in directory.glob('*.tex') if f.stem.startswith('01_')]
```

**Bash:**
```bash
# Create a loop for specific files
for file in 01_*.tex 02_*.tex; do
    pandoc "$file" -f latex -t markdown -o "markdown/${file%.tex}.md"
done
```

### Custom Pandoc Options

Edit the scripts to add custom Pandoc options:

**Python (`convert_file` function):**
```python
cmd = [
    'pandoc',
    str(input_file),
    '-f', 'latex',
    '-t', 'markdown',
    '-o', str(output_file),
    '--wrap=none',
    '--columns=80',      # Add custom option
    '--reference-links'  # Add custom option
]
```

**Bash (`convert_file` function):**
```bash
cmd="$cmd --columns=80"
cmd="$cmd --reference-links"
```

---

## Troubleshooting

### Issue: Special Characters Not Converting

**Problem:** LaTeX special characters like `\$`, `\&` not converting correctly.

**Solution:** Pandoc handles most special characters, but complex LaTeX may require manual editing.

### Issue: Math Equations Not Rendering

**Problem:** LaTeX math (`$equation$`) not converting to Markdown math.

**Solution:** Use `--standalone` flag or manually convert to inline math syntax.

### Issue: Bibliography/Citations Missing

**Problem:** BibTeX citations not appearing in output.

**Solution:** Pandoc requires separate bibliography processing. Consider:
```bash
pandoc input.tex --bibliography=refs.bib -o output.md
```

---

## Script Internals

### Python Script Architecture

```
main()
├── check_pandoc()           # Verify Pandoc installation
├── find_tex_files()         # Locate .tex files
└── convert_file()           # Convert individual file
    └── subprocess.run()     # Execute Pandoc
```

### Bash Script Architecture

```
main()
├── check_pandoc()           # Verify Pandoc installation
├── parse_args()             # Parse command-line arguments
└── convert_file()           # Convert individual file
    └── eval $cmd            # Execute Pandoc command
```

---

## Integration Examples

### Use in Makefile

```makefile
.PHONY: convert-latex

convert-latex:
	python latex_to_markdown.py ./tex ./markdown --standalone --toc
	@echo "Conversion complete"
```

### Use in CI/CD Pipeline

**GitHub Actions:**
```yaml
- name: Convert LaTeX to Markdown
  run: |
    python latex_to_markdown.py ./documents ./output
```

**GitLab CI:**
```yaml
convert:
  script:
    - ./latex_to_markdown.sh ./tex ./markdown
```

---

## License

MIT License - Feel free to modify and distribute.

## Author

**MISJustice Alliance**  
December 10, 2025

## Support

For issues or questions:
1. Check Pandoc documentation: https://pandoc.org/MANUAL.html
2. Verify LaTeX syntax in input files
3. Test with a single simple `.tex` file first

---

## Version History

**v1.0.0** (December 10, 2025)
- Initial release
- Python and Bash implementations
- Basic conversion features
- Command-line argument support
- Error handling and reporting

---

**End of Documentation**
