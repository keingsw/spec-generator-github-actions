import path from "path";
import glob from "glob";
import * as core from "@actions/core";
import {
    getPullRequestByBranchName,
    commitChangesToBranch,
} from "./utils/github";
import { updateToc } from "./toc";
import { generatePdf } from "./generate-pdf";
import { updateRevisionHistory } from "./revision-history";
import { findMarkdownFiles } from "./utils/fs";

async function run() {
    const specDir = core.getInput("specDir");
    const chapterContentsFilename = core.getInput("chapterContentsFilename");
    const chapterIndexFilename = core.getInput("chapterIndexFilename");
    const outputDir = core.getInput("outputDir");
    const outputFilename = core.getInput("outputFilename");

    const [branchName] = core.getInput("branchRef").split("/").slice(-1);
    const { number: prNumber } = await getPullRequestByBranchName(branchName);

    const author = {
        name: "github-actions",
        email: "github-actions@github.com",
    };

    updateToc({
        specDir,
        chapterIndexFilename,
        chapterContentsFilename,
    });
    await updateRevisionHistory({
        prNumber,
        specDir,
        chapterIndexFilename,
    });
    await generatePdf({
        specDir,
        chapterContentsFilename,
        outputDir,
        outputFilename,
    });

    await commitChangesToBranch({
        branchName,
        files: [
            ...findMarkdownFiles(specDir).map((filePath) =>
                path.relative("./", filePath)
            ),
            path.relative("./", `${outputDir}/${outputFilename}`),
        ],
        author,
        commitMessage: "Update TOC and revision history, and re-generate PDF",
    });
}

run();
