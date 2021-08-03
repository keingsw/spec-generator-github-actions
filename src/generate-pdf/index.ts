import fs from "fs";
import { mdToPdf } from "md-to-pdf";
import { findMarkdownFiles } from "../utils/fs";
import * as inputs from "../utils/inputs";

const pageBreak = '\n\n<div class="page-break"></div>\n\n';

const concatMarkdownFiles = (markdownFiles: string[]) => {
    return markdownFiles
        .reduce((accumulator: string[], filePath: string) => {
            accumulator.push(fs.readFileSync(filePath, "utf8").toString());
            return accumulator;
        }, [])
        .join(pageBreak);
};

export const generatePdf = async () => {
    const specDir = inputs.getSpecDir();
    const chapterContentsFilename = inputs.getChapterContentsFilename();
    const outputFilePath = inputs.getOutputFilePath();

    const markdownFiles = findMarkdownFiles(specDir).filter(
        (filename) => !filename.includes(chapterContentsFilename)
    );
    const content = concatMarkdownFiles(markdownFiles);
    // @ts-ignore FIXME: type config properly
    const pdf = await mdToPdf({ content }, {"launch_options": {executablePath: 'google-chrome-unstable', args:["--no-sandbox"]}});

    if (pdf) {
        fs.writeFileSync(outputFilePath, pdf.content, "utf8");
        return outputFilePath;
    }

    return "";
};
