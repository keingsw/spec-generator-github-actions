import fs from "fs";
import path from "path";
import { mdToPdf } from "md-to-pdf";
import PDFMerger from "pdf-merger-js";
import { findMarkdownFiles } from "../utils/fs";
import * as inputs from "../utils/inputs";

const getFileTemplate = (filePath: string) =>
    filePath && fs.existsSync(filePath)
        ? fs.readFileSync(filePath, "utf8").toString()
        : "";

const margePdfFiles = async (pdfFiles: string[]) => {
    const outputFilePath = inputs.getOutputFilePath();
    const merger = new PDFMerger();

    pdfFiles.forEach((pdfFilePath) => {
        merger.add(pdfFilePath);
    });

    await merger.save(outputFilePath);
};

const generateSinglePagePdf = async (
    markdownFilePath: string,
    {
        headerTemplate,
        footerTemplate,
    }: { headerTemplate: string; footerTemplate: string }
) => {
    const specDir = inputs.getSpecDir();
    const outputDir = inputs.getOutputDir();

    const content = fs.readFileSync(markdownFilePath, "utf8").toString();
    const [chapter, section] = path
        .relative(specDir, markdownFilePath.replace(".md", ""))
        .split("/");

    const outputPath = `${outputDir}/${chapter}/${section}.pdf`;

    await mdToPdf(
        { content },
        {
            dest: outputPath,
            body_class: [`page--${chapter}__${section}`],
            pdf_options: {
                headerTemplate,
                footerTemplate,
            },
            launch_options: {
                executablePath: "google-chrome-stable",
                // @ts-ignore
                args: ["--no-sandbox"],
            },
        }
    );

    return outputPath;
};

export const generatePdf = async () => {
    const specDir = inputs.getSpecDir();
    const chapterContentsFilename = inputs.getChapterContentsFilename();

    const markdownFiles = findMarkdownFiles(specDir).filter(
        (filename) => !filename.includes(chapterContentsFilename)
    );
    const headerTemplate = getFileTemplate(inputs.getHeaderFilePath());
    const footerTemplate = getFileTemplate(inputs.getFooterFilePath());

    const generatePdfResults = await markdownFiles.reduce(
        async (previousPromise: Promise<string[]>, markdownFilePath) => {
            const generatePdfResults = await previousPromise;

            const result = await generateSinglePagePdf(markdownFilePath, {
                headerTemplate,
                footerTemplate,
            });

            generatePdfResults.push(result);
            return generatePdfResults;
        },
        Promise.resolve([])
    );

    await margePdfFiles(generatePdfResults);

    Promise.all(
        generatePdfResults.map((pdfFilePath) => {
            if (fs.existsSync(pdfFilePath)) {
                fs.unlinkSync(pdfFilePath);
            }
        })
    );
};
