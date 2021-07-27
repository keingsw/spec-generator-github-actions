import path from "path";
import glob from "glob";
import * as core from "@actions/core";
import {
    getPRBranchName,
    createBranch,
    commitChangesToBranch,
    createPullRequest,
} from "./utils/github";
import { updateToc } from "./toc";
import { generatePdf } from "./generate-pdf";
import { findMarkdownFiles } from "./utils/fs";

async function run() {
    const specDir = core.getInput("specDir");
    const sectionContentsFilename = core.getInput("sectionContentsFilename");
    const outputDir = core.getInput("outputDir");
    const outputFilename = core.getInput("outputFilename");

    const author = {
        name: "github-actions",
        email: "github-actions@github.com",
    };
    const branchName = await getPRBranchName();

    updateToc({
        specDir,
        sectionContentsFilename,
    });
    await commitChangesToBranch({
        branchName,
        files: findMarkdownFiles(specDir, sectionContentsFilename).map(
            (filePath) => path.relative("./", filePath)
        ),
        author,
        commitMessage: "Update TOC",
    });

    // TODO: Update revision history

    await generatePdf({
        specDir,
        sectionContentsFilename,
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

    // await createPullRequest({
    //     baseBranchName,
    //     newBranchName,
    //     title: "Update spec PDF document",
    // });
    // TODO: merge PR
    // TODO: delete branch

    // TODO: upload the PDF to GitHub Actions output
}

run();
