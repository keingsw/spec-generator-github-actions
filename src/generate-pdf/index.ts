import markdownPdf from "markdown-pdf";
import { findMarkdownFiles } from "../utils/fs";

interface GeneratePdfOptions {
    specDir: string;
    chapterContentsFilename: string;
    outputDir: string;
    outputFilename: string;
}

export const generatePdf = ({
    specDir,
    chapterContentsFilename,
    outputDir,
    outputFilename,
}: GeneratePdfOptions): Promise<void> => {
    return new Promise((resolve, reject) => {
        const markdownFiles = findMarkdownFiles(
            specDir,
            chapterContentsFilename
        );

        markdownPdf()
            .concat.from.paths(markdownFiles, {})
            .to(`${outputDir}/${outputFilename}`, () => resolve());
    });
};
