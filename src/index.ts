import path from "path";
import glob from "glob";
import * as core from "@actions/core";
import {
    createBranch,
    commitChangesToBranch,
    createPullRequest,
} from "./utils/github";
import { updateToc } from "./toc";
import { generatePdf } from "./generate-pdf";
import { findMarkdownFiles } from "./utils/fs";

async function run() {
    const workingDir = core.getInput("workingDir");
    const sectionContentsFilename = core.getInput("sectionContentsFilename");
    const outputDir = core.getInput("outputDir");
    const outputFilename = core.getInput("outputFilename");

    const author = {
        name: "github-actions",
        email: "github-actions@github.com",
    };
    const baseBranchName = "master";
    const newBranchName = "generate-spec";

    await createBranch({
        baseBranchName,
        newBranchName,
    });

    updateToc({
        specDir: workingDir,
        sectionContentsFilename,
    });
    await commitChangesToBranch({
        branchName: newBranchName,
        files: findMarkdownFiles(workingDir, sectionContentsFilename).map(
            (filePath) => path.relative("./", filePath)
        ),
        author,
        commitMessage: "Update TOC",
    });

    // TODO: Update revision history

    await generatePdf({
        specDir: workingDir,
        sectionContentsFilename,
        outputDir,
        outputFilename,
    });
    await commitChangesToBranch({
        branchName: newBranchName,
        files: glob
            .sync(`${outputDir}/${outputFilename}`)
            .map((filePath) => path.relative("./", filePath)),
        author,
        commitMessage: "Re-generate PDF",
    });

    await createPullRequest({
        baseBranchName,
        newBranchName,
        title: "Update spec PDF document",
    });
    // TODO: merge PR
    // TODO: delete branch

    // TODO: upload the PDF to GitHub Actions output
}

run();
