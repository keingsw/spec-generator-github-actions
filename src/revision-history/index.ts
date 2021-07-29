import fs from "fs";
import path from "path";
import dateformat from "dateformat";
import { Base64 } from "js-base64";
import {
    getRevisionHistoryCommitsOnPullRequest,
    getFileContentOnBranch,
    Commit,
    PullRequest,
} from "../utils/github";
import { matchSection, updateSection } from "../utils/update-section";

interface UpdateRevisionHistoryOptions {
    pullRequest: PullRequest;
    specDir: string;
    chapterIndexFilename: string;
}

const HEADER = ["改訂番号", "改訂日", "改訂者", "改訂内容"];
const START_COMMENT = "START revision history";
const END_COMMENT = "END revision history";

const matchesStart = (line: string) => {
    const pattern = new RegExp(`^\\[${START_COMMENT}\\]: <>`);
    return pattern.test(line);
};

const matchesEnd = (line: string) => {
    const pattern = new RegExp(`^\\[${END_COMMENT}\\]: <>`);
    return pattern.test(line);
};

const extractChangedChaptersFromCommit = (specDir: string, commit: Commit) => {
    const pattern = new RegExp(`^${path.relative(".", specDir)}\/(.*)/.*\.md$`);
    const { files = [] } = commit;

    return files.reduce((chapters: string[], { filename = "" }) => {
        const matches = filename.match(pattern);
        if (matches) {
            if (chapters.indexOf(matches[1]) === -1) {
                chapters.push(matches[1]);
            }
        }
        return chapters;
    }, []);
};

const extractRowDataFromCommit = (commit: Commit["commit"]) => {
    const pattern = new RegExp(`^\\[revision history\\]\\[(.*)\\]\s?(.*)$`);

    const [, revisionNo, revisionMessage] = commit.message.match(pattern) || [];
    const revisedAt =
        commit.author && commit.author.date
            ? dateformat(new Date(commit.author.date), "yyyy/mm/dd")
            : "";
    const revisedBy =
        commit.author && commit.author.name ? commit.author.name : "";

    return [revisionNo, revisedAt, revisedBy, revisionMessage];
};

const getOriginalRevisionHistory = async (
    indexFilePath: string,
    baseBranchName: string
) => {
    const { content: originalFileContentBase64 } = await getFileContentOnBranch(
        {
            filePath: indexFilePath,
            branchName: baseBranchName,
        }
    );
    const originalFileContent = Base64.decode(originalFileContentBase64);
    const { matched } = matchSection({
        content: originalFileContent,
        matchesStart,
        matchesEnd,
    });

    // NOTE: trim prepended/appended line breaks, header, and division
    return matched.filter((line) => !!line).slice(2);
};

const groupCommitsByChapter = (specDir: string, commits: Commit[]) =>
    commits.reduce(
        (commitsGroupedByChapter: { [key: string]: Commit[] }, commit) => {
            const changedChapters = extractChangedChaptersFromCommit(
                specDir,
                commit
            );

            if (changedChapters) {
                changedChapters.forEach((chapter) =>
                    (commitsGroupedByChapter[chapter] =
                        commitsGroupedByChapter[chapter] || []).push(commit)
                );
            }

            return commitsGroupedByChapter;
        },
        {}
    );

const composeTableRowLine = (row: string[]) => `|${row.join("|")}|`;

const composeHeaderLines = () => {
    return [HEADER, Array<string>(HEADER.length).fill("----")].map(
        composeTableRowLine
    );
};

const composeRevisionHistory = ({
    originalRevisionHistory,
    newRevisionHistory,
}: {
    originalRevisionHistory: string[];
    newRevisionHistory: string[];
}) => {
    return [
        `[${START_COMMENT}]: <>`,
        "",
        ...composeHeaderLines(),
        ...originalRevisionHistory,
        ...newRevisionHistory,
        "",
        `[${END_COMMENT}]: <>`,
    ].join("\n");
};

export const updateRevisionHistory = async ({
    pullRequest,
    specDir,
    chapterIndexFilename,
}: UpdateRevisionHistoryOptions): Promise<void> => {
    const {
        number: prNumber,
        base: { ref: baseBranchName },
    } = pullRequest;
    const commits = await getRevisionHistoryCommitsOnPullRequest(prNumber);
    const commitsGroupedByChapter = groupCommitsByChapter(specDir, commits);

    await Promise.all(
        Object.keys(commitsGroupedByChapter).map(async (chapter) => {
            const indexFilePath = `${specDir}/${chapter}/${chapterIndexFilename}`;

            const originalRevisionHistory = await getOriginalRevisionHistory(
                indexFilePath,
                baseBranchName
            );
            const newRevisionHistory = commitsGroupedByChapter[chapter]
                .map(({ commit }) => extractRowDataFromCommit(commit))
                .map(composeTableRowLine);

            const content = fs.readFileSync(indexFilePath, "utf8").toString();
            const updatedContent = updateSection({
                content,
                matchesStart,
                matchesEnd,
                newContent: composeRevisionHistory({
                    originalRevisionHistory,
                    newRevisionHistory,
                }),
            });
            fs.writeFileSync(indexFilePath, updatedContent, "utf8");
            console.log(
                indexFilePath,
                fs.readFileSync(indexFilePath).toString(),
                "\n\n"
            );
        })
    );
};
