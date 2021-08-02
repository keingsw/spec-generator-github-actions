## About

GitHub Action to merge markdown files and convert into a PDF file, and generate a nice looking a specification document.

- Auto-generate TOC
- Auto-update revision history tracing commits on the specified brach
- Converts markdown files into a styled PDF file

## Get Started

### 0. Prepare markdown files

* File structure

Supports two-layered structure as follows only for now:

```
spec-md/
　├ 00_chapter00/
　│　├ _index.md
　│　├ _contents.md
　│　├ section1.md
　│　└ section2.md
　│
　├ 01_chapter01/
　│　├...
　│　├...
 
```

* Index

`_index.md` is required in each chapter directory for the chapter toc and revision history to be generated properly.

Utilise the option `chapterIndexFilename` if you want to use different file name.

* Page Order

`_contents.md` is required to configure the page order.

Utilise the option `chapterContentsFilename` if you want to use different file name.

* Page Break

Place the following tag where you want to split pages.

```<div class="page-break"></div>```


### 1 .Setup TOC

* Location

Place START/END comments in where you'd like the toc to be generated.

Example (/spec-md/00_chapter00/section01.md):
```
## Section1

[START toc]: <>
[END toc]: <>

### Lorem ipsum dolor sit amet

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum dapibus in neque sed molestie. Nullam ut diam sit amet velit pulvinar rutrum. Aenean rutrum nunc maximus ipsum egestas rutrum. Vivamus egestas convallis augue. Nam iaculis luctus congue. Pellentesque a eros quis lorem fringilla condimentum nec auctor magna. Integer eu sollicitudin nisl. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae;

### Suspendisse ultricies pellentesque purus

Suspendisse ultricies pellentesque purus, sed semper nisi aliquam ut. Proin eget nibh ipsum. Aliquam erat volutpat. Cras non tortor molestie, dignissim dui vel, lacinia leo. Proin gravida vel libero quis consectetur. Ut porta, est at 
...
````

### 2. Setup Revision History

* Location

Place START/END comments in where you'd like the revision history to be generated.

Example (/spec-md/00_chapter00/_index.md):
```
# Title of CHAPTER00

[START revision history]: <>
[END revision history]: <>

[START toc]: <>
[END toc]: <>
````

### 3. Setup PDF

* Assets
* Header and Footer

### 4. Setup workflow

Example:
```
name: Spec Generator
on:
    workflow_dispatch:
jobs:
    generatePDF:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v2
            - id: generate
              uses: ./
              with:
                  accessToken: ${{ secrets.GITHUB_TOKEN }}
                  specDir: "spec-md"
                  outputDir: "outputs"
                  outputFilename: "spec.pdf"
                  chapterContentsFilename: "contents.md"
                  chapterIndexFilename: "index.md"
            - uses: actions/upload-artifact@v2
              with:
                  name: spec-pdf
                  path: ${{ steps.generate.outputs.pdfPath }}

```

### Options
|name|description|default|required|example|
|----|----|----|----|----|
|accessToken|Secret GitHub API token|${{ github.token }}|true||
|specDir|Directory where all the Markdown files are located|.|true||
|outputFilePath|Path to PDF file to be generated|./spec.pdf|true||
|chapterContentsFilename|Chapter contents filename|_contents.md|true||
|chapterIndexFilename|Chapter index filename|_index.md|true||
|tocSectionStart|Identifier for the start line of toc section|START toc|true||
|tocSectionEnd|Identifier for the end line of toc section|END toc|true||
|revisionHistorySectionStart|Identifier for the start line of revision history section|START revision history|true||
|revisionHistorySectionEnd|Identifier for the end line of revision history section|END revision history|true||
|revisionCommitRegExp|Regular expression to identify revision commits |`^revision\((?<revision_number>.*)\):((?<revision_notes>.*))$`|true||


## Usage

### 0. Create PR

### 1. Edit markdown files and commit

### 2. Run workflow

### 3. Download PDF




