import glob from "glob";
import markdownPdf from "markdown-pdf";

// TODO: take these as options from input
const SPEC_DIR = "./sample-spec";
const SECTION_CONTENTS_FILENAME = `_contents`;
const OUTPUT_PATH = "./sample-spec/spec.pdf";


const findMarkdownFiles = (specDir: string) => {
  return glob
    .sync(`${specDir}/**/*.md`)
    .filter((file) => !file.includes(`${SECTION_CONTENTS_FILENAME}.md`));  
}

const generatePdf = () => {
  const markdownFiles = findMarkdownFiles(SPEC_DIR);

  markdownPdf()
    .concat.from.paths(markdownFiles, {})
    .to(OUTPUT_PATH);
}

generatePdf()
