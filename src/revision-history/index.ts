import fs from "fs";
import path from "path";
import dateformat from "dateformat";
import { Base64 } from "js-base64";
import {
    getPullRequestByBranchName,
    getRevisionHistoryCommitsOnPullRequest,
    getFileContentOnBranch,
    Commit,
} from "../utils/github";
import { matchSection, updateSection } from "../utils/update-section";
import * as inputs from "../utils/inputs";

const HEADER = ["改訂番号", "改訂日", "改訂者", "改訂内容"];

const revisionHistorySectionRegExp = inputs.getRevisionHistorySectionRegExp();

const matchesStart = (line: string) => {
    return revisionHistorySectionRegExp.start.test(line);
};

const matchesEnd = (line: string) => {
    return revisionHistorySectionRegExp.end.test(line);
};

const extractChangedChaptersFromCommit = (commit: Commit) => {
    const specDir = inputs.getSpecDir();
    const pattern = new RegExp(
        `^${path.relative(".", specDir)}\\/(.*)/.*\\.md$`
    );
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
    const matched = commit.message.match(inputs.getRevisionCommitRegExp());

    const revisionNumber =
        matched && matched.groups && matched.groups.revision_number
            ? matched.groups.revision_number
            : "";
    const revisionNotes =
        matched && matched.groups && matched.groups.revision_notes
            ? matched.groups.revision_notes
            : "";
    const revisedAt =
        commit.author && commit.author.date
            ? dateformat(new Date(commit.author.date), "yyyy/mm/dd")
            : "";
    const revisedBy =
        commit.author && commit.author.name ? commit.author.name : "";

    return [revisionNumber, revisedAt, revisedBy, revisionNotes];
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

const groupCommitsByChapter = (commits: Commit[]) =>
    commits.reduce(
        (commitsGroupedByChapter: { [key: string]: Commit[] }, commit) => {
            const changedChapters = extractChangedChaptersFromCommit(commit);

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

const composeTableRow = (row: string[]) => `|${row.join("|")}|`;

const composeHeaderRows = () => {
    return [HEADER, Array<string>(HEADER.length).fill("----")].map(
        composeTableRow
    );
};

const composeRevisionHistory = ({
    originalRevisionHistory,
    newRevisionHistory,
}: {
    originalRevisionHistory: string[];
    newRevisionHistory: string[];
}) => {
    const revisionHistorySectionMdComments =
        inputs.getRevisionHistorySectionMdComments();
    return [
        revisionHistorySectionMdComments.start,
        "",
        ...composeHeaderRows(),
        ...originalRevisionHistory,
        ...newRevisionHistory,
        "",
        revisionHistorySectionMdComments.end,
    ].join("\n");
};

export const updateRevisionHistory = async (): Promise<void> => {
    const specDir = inputs.getSpecDir();
    const chapterIndexFilename = inputs.getChapterIndexFilename();
    const workingBranchName = inputs.getWorkingBranchName();
    const revisionCommitRegExp = inputs.getRevisionCommitRegExp();

    const {
        number: prNumber,
        base: { ref: baseBranchName },
    } = await getPullRequestByBranchName(workingBranchName);
    const commits = await getRevisionHistoryCommitsOnPullRequest(
        prNumber,
        revisionCommitRegExp
    );
    console.log(commits);
    const commitsGroupedByChapter = groupCommitsByChapter(commits);

    await Promise.all(
        Object.keys(commitsGroupedByChapter).map(async (chapter) => {
            const indexFilePath = `${specDir}/${chapter}/${chapterIndexFilename}`;

            const originalRevisionHistory = await getOriginalRevisionHistory(
                indexFilePath,
                baseBranchName
            );
            const newRevisionHistory = commitsGroupedByChapter[chapter]
                .map(({ commit }) => extractRowDataFromCommit(commit))
                .map(composeTableRow);

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
        })
    );
};
