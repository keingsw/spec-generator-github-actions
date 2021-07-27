import path from "path";
import glob from "glob";
import * as core from "@actions/core";
import {
    getPullRequestBranchName,
    commitChangesToBranch,
} from "./utils/github";
import { updateToc } from "./toc";
import { generatePdf } from "./generate-pdf";
import { updateRevisionHistory } from "./revision-history";
import { findMarkdownFiles } from "./utils/fs";

async function run() {
    const specDir = core.getInput("specDir");
    const sectionContentsFilename = core.getInput("sectionContentsFilename");
    const outputDir = core.getInput("outputDir");
    const outputFilename = core.getInput("outputFilename");
    // const prNumber = +core.getInput("prNumber");
    const prNumber = 20;

    const author = {
        name: "github-actions",
        email: "github-actions@github.com",
    };

    const branchName = await getPullRequestBranchName(prNumber);

    // updateToc({
    //     specDir,
    //     sectionContentsFilename,
    // });
    // await commitChangesToBranch({
    //     branchName,
    //     files: findMarkdownFiles(specDir, sectionContentsFilename).map(
    //         (filePath) => path.relative("./", filePath)
    //     ),
    //     author,
    //     commitMessage: "Update TOC",
    // });

    updateRevisionHistory({
        prNumber,
        specDir,
    });
    // await commitChangesToBranch({
    //     branchName,
    //     files: glob
    //         .sync(`${specDir}/**/_index.md`)
    //         .map((filePath) => path.relative("./", filePath)),
    //     author,
    //     commitMessage: "Update Revision History",
    // });

    // await generatePdf({
    //     specDir,
    //     sectionContentsFilename,
    //     outputDir,
    //     outputFilename,
    // });
    // await commitChangesToBranch({
    //     branchName,
    //     files: glob
    //         .sync(`${outputDir}/${outputFilename}`)
    //         .map((filePath) => path.relative("./", filePath)),
    //     author,
    //     commitMessage: "Re-generate PDF",
    // });
}

run();
