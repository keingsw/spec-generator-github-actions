import fs from "fs";
import { mdToPdf } from "md-to-pdf";
import { findMarkdownFiles } from "../utils/fs";

interface GeneratePdfOptions {
    specDir: string;
    chapterContentsFilename: string;
    outputDir: string;
    outputFilename: string;
}

const pageBreak = '\n\n<div class="page-break"></div>\n\n';

const concatMarkdownFiles = (markdownFiles: string[]) => {
    return markdownFiles
        .reduce((accumulator: string[], filePath: string) => {
            accumulator.push(fs.readFileSync(filePath, "utf8").toString());
            return accumulator;
        }, [])
        .join(pageBreak);
};

export const generatePdf = async ({
    specDir,
    chapterContentsFilename,
    outputDir,
    outputFilename,
}: GeneratePdfOptions) => {
    const markdownFiles = findMarkdownFiles(specDir).filter(
        (filename) => !filename.includes(chapterContentsFilename)
    );
    const content = concatMarkdownFiles(markdownFiles);
    const pdf = await mdToPdf({ content });

    if (pdf) {
        fs.writeFileSync(`${outputDir}/${outputFilename}`, pdf.content, "utf8");
    }
};
