import fs from "fs";
import path from "path";
import { mdToPdf } from "md-to-pdf";
import PDFMerger from "pdf-merger-js";
import { parse } from "node-html-parser";
import { findMarkdownFiles } from "../utils/fs";
import * as inputs from "../utils/inputs";

const selectMediaType = (filename: string) => {
    const extension = filename.split(".").pop();
    if (extension === "svg") {
        return `image/svg+xml`;
    }
    return `image/${extension}`;
};

const encodeImageToDataUrl = (filename: string) => {
    const mediaType = selectMediaType(filename);
    const base64 = fs.readFileSync(filename, {
        encoding: "base64",
    });
    return `data:${mediaType};base64,${base64}`;
};

const convertImageSrcToBase64 = (basedir: string, template: string) => {
    const root = parse(template);
    const images = root.querySelectorAll("img[src]");

    images.forEach((image) => {
        const src = image.getAttribute("src") || "";
        if (src && !/^data:/.test(src)) {
            image.setAttribute("src", encodeImageToDataUrl(`${basedir}/src`));
        }
    });

    return root.toString();
};

const getFileTemplate = (filePath: string) => {
    if (!filePath || !fs.existsSync(filePath)) {
        return "";
    }

    const basedir = path.dirname(filePath);
    const template = fs.readFileSync(filePath, "utf8").toString();
    return convertImageSrcToBase64(basedir, template);
};

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
    console.log({ headerTemplate, footerTemplate });

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
