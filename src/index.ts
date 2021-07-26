import path from "path";
import glob from "glob";
import * as core from "@actions/core";
import { createPullRequest, commitChangesToPullRequest } from "./utils/github";
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

    const pr = await createPullRequest({
        baseBranch: "master",
        newBranch: "generate-spec",
        author,
        commitMessage: "Update Spec PDF",
    });

    updateToc({
        specDir: workingDir,
        sectionContentsFilename,
    });
    // TODO: Commit changes

    // TODO: Update revision history

    // Generate PDF
    await generatePdf({
        specDir: workingDir,
        sectionContentsFilename,
        outputDir,
        outputFilename,
    });
    // TODO: Commit changes

    // TODO: Merge PR

    // TODO: upload the PDF to GitHub Actions output
}

run();
