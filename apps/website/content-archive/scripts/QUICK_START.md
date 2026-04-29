# Quick Start Guide - LaTeX to Markdown Converter

---

QUICK START GUIDE - LaTeX to Markdown Converter

## 🚀 FASTEST WAY TO CONVERT

### Python (Cross-Platform)
```bash
python latex_to_markdown.py
```

### Bash (Unix/Linux/Mac)
```bash
./latex_to_markdown.sh
```

**That's it!** All .tex files in current directory → ./markdown/*.md

## 📋 PREREQUISITES

1. **Install Pandoc** (one-time setup)

**macOS:**
   ```bash
brew install pandoc
   ```

**Ubuntu/Debian:**
   ```bash
sudo apt-get install pandoc
   ```

**Windows:**
Download installer from https://pandoc.org/installing.html

2. **Verify Installation**
   ```bash
pandoc --version
   ```
Should show: pandoc 2.x or higher

## 📁 COMMON USE CASES

### Use Case 1: Convert Current Directory
```bash
# Python
python latex_to_markdown.py

# Bash
./latex_to_markdown.sh
```
**Result:** Creates files in `./docs/` from all converted .md files

### Use Case 2: Convert Specific Folder
```bash
# Python
python latex_to_markdown.py /path/to/legal-docs

# Bash
./latex_to_markdown.sh /path/to/legal-docs
```
**Result:** Creates `/path/to/legal-docs/markdown/` with .md files

### Use Case 3: Choose Output Location
```bash
# Python
python latex_to_markdown.py ./tex ./output

# Bash
./latex_to_markdown.sh ./tex ./output
```
**Result:** Creates `./output/` with converted files

### Use Case 4: Professional Documents (with TOC)
```bash
# Python
python latex_to_markdown.py --standalone --toc

# Bash
./latex_to_markdown.sh --standalone --toc
```
**Result:** Markdown files with table of contents

## 🎯 RECOMMENDED WORKFLOW FOR LEGAL DOCUMENTS

### Step 1: Organize Files
```
legal-docs/
├── tex/
│   ├── 01_Executive_Summary.tex
│   ├── 02_Cover_Letter.tex
│   └── 09_Declaration.tex
└── (scripts here)
```

### Step 2: Run Conversion
```bash
# Python
python latex_to_markdown.py ./tex ./markdown --standalone

# Bash
./latex_to_markdown.sh ./tex ./markdown --standalone
```

### Step 3: Verify Output
```
legal-docs/
├── tex/ (originals)
└── markdown/
    ├── 01_Executive_Summary.md ✓
    ├── 02_Cover_Letter.md ✓
    └── 09_Declaration.md ✓
```

### Step 4: Use Markdown Files
- Publish to GitHub/GitLab
- Convert to HTML/PDF with Pandoc
- Edit with any text editor
- Track changes in Git

## ⚡ QUICK REFERENCE

### Get Help
```bash
python latex_to_markdown.py --help
./latex_to_markdown.sh --help
```

### Common Options
| What You Want | Python | Bash |
|---------------|--------|------|
| Table of contents | `--toc` | `--toc` |
| Standalone docs | `--standalone` | `--standalone` |
| Extract images | `--extract-media` | `--media` |
| See details | `--verbose` | (always verbose) |

## 🔧 TROUBLESHOOTING (Top 3 Issues)

### 1. "Pandoc not found"
**Problem:** Script can't find Pandoc
**Solution:**
```bash
# macOS
brew install pandoc

# Ubuntu/Debian
sudo apt-get install pandoc

# Then verify
pandoc --version
```

### 2. "No .tex files found"
**Problem:** Wrong directory or no LaTeX files
**Solution:** Check you're in the right directory
```bash
# List .tex files
ls *.tex

# If in wrong directory, specify path
python latex_to_markdown.py /correct/path
```

### 3. "Permission denied" (Bash only)
**Problem:** Script not executable
**Solution:**
```bash
chmod +x latex_to_markdown.sh
```

## 📊 WHAT TO EXPECT

### Input: LaTeX
```latex
\section*{Case Summary}

**Elvis Nuno** was subjected to \textit{systematic harassment}.

\begin{itemize}
\item False reporting
\item Malicious prosecution
\end{itemize}
```

### Output: Markdown
```markdown
## Case Summary

**Elvis Nuno** was subjected to *systematic harassment*.

- False reporting
- Malicious prosecution
```

### ✅ Conversions That Work Well
- Section headers
- Bold/italic text
- Lists (bullet and numbered)
- Basic tables
- Links and citations
- Special characters ($, &, %, etc.)

### ⚠️ May Need Manual Editing
- Complex math equations
- Custom LaTeX macros
- Bibliography/BibTeX
- Complex tables with merged cells
- TikZ diagrams

## 💡 PRO TIPS

1. **Start Small**: Test with one .tex file first
   ```bash
# Copy one file to test directory
cp 01_Document.tex test/
cd test/
python latex_to_markdown.py
   ```

2. **Keep Originals**: Scripts don't modify .tex files
   - Original .tex files are never touched
   - Safe to run multiple times

3. **Version Control**: Commit before converting
   ```bash
git add *.tex
git commit -m "Original LaTeX files"
python latex_to_markdown.py
git add markdown/*.md
git commit -m "Converted to Markdown"
   ```

4. **Batch Everything**: No need to convert one-by-one
   - Scripts automatically find all .tex files
   - Converts in single run

## 🎓 NEXT STEPS AFTER CONVERSION

### 1. Publish to GitHub
```bash
git add markdown/*.md
git commit -m "Add Markdown documentation"
git push
```

### 2. Convert to Other Formats
```bash
# To HTML
pandoc markdown/01_Document.md -o output.html

# To PDF
pandoc markdown/01_Document.md -o output.pdf

# To Word
pandoc markdown/01_Document.md -o output.docx
```

### 3. Create Documentation Site
Use with Jekyll, Hugo, MkDocs, or GitBook

## 📞 NEED MORE HELP?

1. **Read Full Documentation:** BATCH_CONVERTER_README.md
2. **Pandoc Manual:** https://pandoc.org/MANUAL.html
3. **Test with Sample File:** Start simple, add complexity

**You're Ready!** Run the script and start converting.
