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

        updateToc();
        await updateRevisionHistory();
        const pdfPath = await generatePdf();

        await commitChangesToBranch({
            files: [
                ...findMarkdownFiles(specDir).map((filePath) =>
                    path.relative("./", filePath)
                ),
                ...(pdfPath && [path.relative("./", pdfPath)]),
            ],
            author,
            commitMessage:
                "[Spec Generator] Update TOC and revision history, and re-generate PDF",
        });

        core.setOutput("pdfPath", pdfPath);
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();
