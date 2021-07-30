import fs from "fs";
import * as github from "@actions/github";
import { Endpoints } from "@octokit/types";
import * as inputs from "../utils/inputs";
import { getWorkingBranchName } from "./inputs";

interface Author {
    name: string;
    email: string;
}

interface CommitOptions {
    author: Author;
    commitMessage: string;
}

type CreateTreeParameters =
    Endpoints["POST /repos/{owner}/{repo}/git/trees"]["parameters"];

type Tree = Omit<CreateTreeParameters, "owner" | "repo">["tree"];

type GetCommitsResponse =
    Endpoints["GET /repos/{owner}/{repo}/commits/{ref}"]["response"];

export type Commit = GetCommitsResponse["data"];

type FileContent = {
    type: "file";
    encoding: string;
    size: number;
    name: string;
    path: string;
    content: string;
    sha: string;
    url: string;
    git_url: string;
    html_url: string;
    download_url: string;
    _links: {
        git: string;
        self: string;
        html: string;
    };
};

const getOctokit = () => github.getOctokit(inputs.getAccessToken());

const createTreeFromFiles = async (files: string[]) => {
    const octokit = getOctokit();
    const { owner, repo } = inputs.getOwnerAndRepo();

    const filesBlobs = await Promise.all(
        files.map(async (filePath: string) => {
            const content = await fs.readFileSync(filePath, "utf8");
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
    const { owner, repo } = inputs.getOwnerAndRepo();

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
    const { owner, repo } = inputs.getOwnerAndRepo();

    await octokit.rest.git.updateRef({
        owner,
        repo,
        ref: `heads/${branchName}`,
        sha: commitSha,
    });
};

export const getPullRequestByBranchName = async (branchName: string) => {
    const octokit = getOctokit();
    const { owner, repo } = inputs.getOwnerAndRepo();
    const pr = await octokit.rest.pulls.list({
        owner,
        repo,
        head: `${owner}/${branchName}`,
    });

    if (pr.data.length !== 1) {
        throw new Error(
            `Expected only 1 pull request but no or more pull requests are found for the given branch "${branchName}".`
        );
    }

    return pr.data[0];
};

export const getFileContentOnBranch = async ({
    filePath,
    branchName,
}: {
    filePath: string;
    branchName: string;
}) => {
    const octokit = getOctokit();
    const { owner, repo } = inputs.getOwnerAndRepo();

    const content = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: filePath,
        ref: branchName,
    });

    if (Array.isArray(content.data) || content.data.type !== "file") {
        let message = `Expected a single file but `;

        if (Array.isArray(content.data)) {
            message += `a directory was retrieved`;
        } else {
            message += `a ${content.data.type} was retrieved`;
        }

        throw new Error(message);
    }

    // FIXME: Find a better way to type `content.data` later
    return content.data as FileContent;
};

export const getRevisionHistoryCommitsOnPullRequest = async (
    prNumber: number,
    revisionCommitRegExp: RegExp
) => {
    const octokit = getOctokit();
    const { owner, repo } = inputs.getOwnerAndRepo();

    const commitsOnPR = await octokit.rest.pulls.listCommits({
        owner,
        repo,
        pull_number: prNumber,
    });

    return await commitsOnPR.data.reduce(
        async (previousPromise: Promise<Commit[]>, { sha }) => {
            const commits = await previousPromise;

            const { data: commit } = await octokit.rest.repos.getCommit({
                owner,
                repo,
                ref: sha,
            });

            if (revisionCommitRegExp.test(commit.commit.message)) {
                commits.push(commit);
            }

            return commits;
        },
        Promise.resolve([])
    );
};

export const commitChangesToBranch = async ({
    files,
    author,
    commitMessage,
}: {
    files: string[];
    author: Author;
    commitMessage: string;
}) => {
    const octokit = getOctokit();
    const { owner, repo } = inputs.getOwnerAndRepo();
    const workingBranchName = inputs.getWorkingBranchName();

    const branchRef = await octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${workingBranchName}`,
    });

    const newTree = await createTreeFromFiles(files);
    const newCommit = await commit({
        commitSha: branchRef.data.object.sha,
        newTree,
        author,
        commitMessage,
    });

    await setBranchToCommit({
        branchName: workingBranchName,
        commitSha: newCommit.data.sha,
    });
};
