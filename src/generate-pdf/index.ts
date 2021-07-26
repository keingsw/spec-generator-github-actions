import markdownPdf from "markdown-pdf";
import { findMarkdownFiles } from "../utils/fs";

interface GeneratePdfOptions {
    specDir: string;
    sectionContentsFilename: string;
    outputDir: string;
    outputFilename: string;
}

export const generatePdf = ({
    specDir,
    sectionContentsFilename,
    outputDir,
    outputFilename,
}: GeneratePdfOptions) => {
    const markdownFiles = findMarkdownFiles(specDir, sectionContentsFilename);
    markdownPdf()
        .concat.from.paths(markdownFiles, {})
        .to(`${outputDir}/${outputFilename}`);
};
