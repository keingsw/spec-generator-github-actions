const core = require("@actions/core");
const github = require("@actions/github");

interface Options {
    baseBranch: string;
    newBranch: string;
    author: {
        name: string;
        email: string;
    };
    commitMessage: string;
}

export async function createPullRequest({
    baseBranch,
    newBranch,
    author,
    commitMessage,
}: Options) {
    const accessToken = core.getInput("accessToken");
    const [owner, repo] = core.getInput("repository").split("/");

    const octokit = github.getOctokit(accessToken);

    const baseBranchRef = await octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${baseBranch}`,
    });

    const newBranchRef = await octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${newBranch}`,
        sha: baseBranchRef.data.object.sha,
    });

    const currentCommit = await octokit.rest.git.getCommit({
        owner,
        repo,
        commit_sha: newBranchRef.data.object.sha,
    });

    const newCommit = await octokit.rest.git.createCommit({
        owner,
        repo,
        tree: currentCommit.data.tree.sha,
        parents: [currentCommit.data.sha],
        author,
        message: commitMessage,
    });

    await octokit.rest.git.updateRef({
        owner,
        repo,
        ref: `heads/${newBranch}`,
        sha: newCommit.data.sha,
    });

    const pr = await octokit.rest.pulls.create({
        owner,
        repo,
        head: newBranch,
        base: baseBranch,
        title: commitMessage,
    });

    return pr;
}
