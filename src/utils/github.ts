import { readFileSync } from "fs-extra";
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

const getFileAsUTF8 = (filePath: string) => readFileSync(filePath, "utf8");

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

export async function createBranch({
    baseBranchName,
    newBranchName,
}: {
    baseBranchName: string;
    newBranchName: string;
}) {
    const octokit = getOctokit();
    const { owner, repo } = getOwnerAndRepo();

    const baseBranchRef = await octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${baseBranchName}`,
    });

    return await octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${newBranchName}`,
        sha: baseBranchRef.data.object.sha,
    });
}

export async function getPRBranchName() {
    const octokit = getOctokit();
    const { owner, repo } = getOwnerAndRepo();
    const prNumber = core.getInput("prNumber");
    const pr = await octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: +prNumber,
    });

    return pr.data.head.ref;
}

export async function createPullRequest({
    baseBranchName,
    newBranchName,
    title,
}: {
    baseBranchName: string;
    newBranchName: string;
    title: string;
}) {
    const octokit = getOctokit();
    const { owner, repo } = getOwnerAndRepo();

    return await octokit.rest.pulls.create({
        owner,
        repo,
        base: baseBranchName,
        head: newBranchName,
        title,
    });
}

export async function commitChangesToBranch({
    branchName,
    files,
    author,
    commitMessage,
}: {
    branchName: string;
    files: string[];
    author: Author;
    commitMessage: string;
}) {
    const octokit = getOctokit();
    const { owner, repo } = getOwnerAndRepo();

    const branchRef = await octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${branchName}`,
    });

    const newTree = await createTreeFromFiles(files);
    const newCommit = await commit({
        commitSha: branchRef.data.object.sha,
        newTree,
        author,
        commitMessage,
    });

    await setBranchToCommit({
        branchName,
        commitSha: newCommit.data.sha,
    });
}
