import markdownPdf from "markdown-pdf";
import through2 from "through2";
import { findMarkdownFiles } from "../utils/fs";

interface GeneratePdfOptions {
    specDir: string;
    chapterContentsFilename: string;
    outputDir: string;
    outputFilename: string;
}

const pageBreak = '\n\n<div style="page-break-before: always;"></div>\n\n';

function preProcessMd() {
    return through2(function (data, enc, cb) {
        let nd = data.toString().replace(/<!-- PAGEBREAK -->/g, pageBreak);
        cb(null, Buffer.from(nd) + pageBreak);
    });
}

export const generatePdf = ({
    specDir,
    chapterContentsFilename,
    outputDir,
    outputFilename,
}: GeneratePdfOptions): Promise<void> => {
    return new Promise((resolve, reject) => {
        const markdownFiles = findMarkdownFiles(specDir).filter(
            (filename) => !filename.includes(chapterContentsFilename)
        );

        markdownPdf({
            preProcessMd,
            remarkable: { breaks: true, html: true },
        })
            .concat.from.paths(markdownFiles, {})
            .to(`${outputDir}/${outputFilename}`, () => resolve());
    });
};
