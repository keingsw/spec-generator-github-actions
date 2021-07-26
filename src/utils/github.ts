import { readFile } from "fs-extra";
import * as core from "@actions/core";
import * as github from "@actions/github";
import { Endpoints } from "@octokit/types";

interface Author {
    name: string;
    email: string;
}

interface CommitOptions {
    author: Author;
    commitMessage: string;
}

type CreatePullRequestResponse =
    Endpoints["POST /repos/{owner}/{repo}/pulls"]["response"];

type CreateTreeResponse =
    Endpoints["POST /repos/{owner}/{repo}/git/trees"]["parameters"];

type Tree = Omit<CreateTreeResponse, "owner" | "repo">["tree"];

function getOctokit() {
    const accessToken = core.getInput("accessToken");
    return github.getOctokit(accessToken);
}

function getOwnerAndRepo() {
    const [owner, repo] = core.getInput("repository").split("/");
    return { owner, repo };
}

const getFileAsUTF8 = (filePath: string) => readFile(filePath, "utf8");

const createTreeFromFiles = async (files: string[]) => {
    const octokit = getOctokit();
    const { owner, repo } = getOwnerAndRepo();

    const filesBlobs = await Promise.all(
        files.map(async (filePath: string) => {
            const content = await getFileAsUTF8(filePath);
            const blobData = await octokit.rest.git.createBlob({
                owner,
                repo,
                content,
                encoding: "utf-8",
            });
            return blobData.data;
        })
    );

    const tree = filesBlobs.map(({ sha }, index) => ({
        path: files[index],
        mode: `100644`,
        type: `blob`,
        sha,
    })) as Tree;

    return tree;
};

const createBranch = async ({
    baseBranch,
    newBranch,
}: {
    baseBranch: string;
    newBranch: string;
}) => {
    const octokit = getOctokit();
    const { owner, repo } = getOwnerAndRepo();

    const baseBranchRef = await octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${baseBranch}`,
    });

    return await octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${newBranch}`,
        sha: baseBranchRef.data.object.sha,
    });
};

const commit = async ({
    commitSha,
    newTree,
    author,
    commitMessage,
}: {
    commitSha: string;
    newTree?: Tree;
} & CommitOptions) => {
    const octokit = getOctokit();
    const { owner, repo } = getOwnerAndRepo();

    const currentCommit = await octokit.rest.git.getCommit({
        owner,
        repo,
        commit_sha: commitSha,
    });

    const newTreeSha = newTree
        ? (
              await octokit.rest.git.createTree({
                  owner,
                  repo,
                  tree: newTree,
                  base_tree: currentCommit.data.tree.sha,
              })
          ).data.sha
        : currentCommit.data.tree.sha;

    console.log("newTreeSha", newTreeSha);

    return await octokit.rest.git.createCommit({
        owner,
        repo,
        tree: newTreeSha,
        parents: [currentCommit.data.sha],
        author,
        message: commitMessage,
    });
};

const setBranchToCommit = async ({
    branchName,
    commitSha,
}: {
    branchName: string;
    commitSha: string;
}) => {
    const octokit = getOctokit();
    const { owner, repo } = getOwnerAndRepo();

    await octokit.rest.git.updateRef({
        owner,
        repo,
        ref: `heads/${branchName}`,
        sha: commitSha,
    });
};

export async function createPullRequest({
    baseBranch,
    newBranch,
    author,
    commitMessage,
}: { baseBranch: string; newBranch: string } & CommitOptions) {
    const octokit = getOctokit();
    const { owner, repo } = getOwnerAndRepo();

    const newBranchRef = await createBranch({
        baseBranch,
        newBranch,
    });

    const newCommit = await commit({
        commitSha: newBranchRef.data.object.sha,
        author,
        commitMessage,
    });

    await setBranchToCommit({
        branchName: newBranch,
        commitSha: newCommit.data.sha,
    });

    return await octokit.rest.pulls.create({
        owner,
        repo,
        head: newBranch,
        base: baseBranch,
        author,
        title: commitMessage,
    });
}

export async function commitChangesToPullRequest({
    pr,
    files,
    author,
    commitMessage,
}: {
    pr: CreatePullRequestResponse;
    files: string[];
    author: Author;
    commitMessage: string;
}) {
    const newTree = await createTreeFromFiles(files);
    const newCommit = await commit({
        commitSha: pr.data.head.sha,
        newTree,
        author,
        commitMessage,
    });

    await setBranchToCommit({
        branchName: pr.data.head.ref,
        commitSha: newCommit.data.sha,
    });
}
