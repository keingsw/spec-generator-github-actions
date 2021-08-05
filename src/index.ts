import path from "path";
import * as core from "@actions/core";
import { updateToc } from "./toc";
import { generatePdf } from "./generate-pdf";
import { updateRevisionHistory } from "./revision-history";
import { commitChangesToBranch } from "./utils/github";
import * as inputs from "./utils/inputs";
import { findMarkdownFiles } from "./utils/fs";

async function run() {
    const author = {
        name: "github-actions",
        email: "github-actions@github.com",
    };

    try {
        const specDir = inputs.getSpecDir();
        const outputFilename = inputs.getOutputFilename();

        updateToc();
        await updateRevisionHistory();
        await generatePdf();

        await commitChangesToBranch({
            files: [
                ...findMarkdownFiles(specDir).map((filePath) =>
                    path.relative("./", filePath)
                ),
                path.relative("./", outputFilename),
            ],
            author,
            commitMessage:
                "[Spec Generator] Update TOC and revision history, and re-generate PDF",
        });

        core.setOutput("pdfPath", outputFilename);
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();
