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
    const [{ number: prNumber }] = await getPullRequestByBranchName(branchName);

    const author = {
        name: "github-actions",
        email: "github-actions@github.com",
    };

    updateToc({
        specDir,
        chapterIndexFilename,
        chapterContentsFilename,
    });
    await commitChangesToBranch({
        branchName,
        files: findMarkdownFiles(specDir).map((filePath) =>
            path.relative("./", filePath)
        ),
        author,
        commitMessage: "Update TOC",
    });

    updateRevisionHistory({
        prNumber,
        specDir,
        chapterIndexFilename,
    });
    await commitChangesToBranch({
        branchName,
        files: findMarkdownFiles(specDir).map((filePath) =>
            path.relative("./", filePath)
        ),
        author,
        commitMessage: "Update Revision History",
    });

    await generatePdf({
        specDir,
        chapterContentsFilename,
        outputDir,
        outputFilename,
    });
    await commitChangesToBranch({
        branchName,
        files: glob
            .sync(`${outputDir}/${outputFilename}`)
            .map((filePath) => path.relative("./", filePath)),
        author,
        commitMessage: "Re-generate PDF",
    });
}

run();
