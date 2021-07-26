import { createPullRequest } from "./github-utils";
import { updateToc } from "./toc";
import { generatePdf } from "./generate-pdf";

async function run() {
    const pr = await createPullRequest({
        baseBranch: "master",
        newBranch: "generate-spec",
        author: {
            name: "github-actions",
            email: "github-actions@github.com",
        },
        commitMessage: "Update Spec PDF",
    });

    // Update TOC
    updateToc();
    // TODO: Commit changes

    // TODO: Update revision history

    // Generate PDF
    generatePdf();
    // TODO: Commit changes

    // TODO: Merge PR

    // TODO: upload the PDF to GitHub Actions output
}

run();
