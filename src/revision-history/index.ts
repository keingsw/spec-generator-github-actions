import fs from "fs";
import path from "path";
import { Endpoints } from "@octokit/types";
import {
    getRevisionHistoryCommitsOnPullRequest,
    Commit,
} from "../utils/github";

interface UpdateRevisionHistoryOptions {
    prNumber: number;
    specDir: string;
}

const HEADER = ["改訂番号", "改訂日", "改訂者", "改訂内容"];
const START_COMMENT = "START revision history";
const END_COMMENT = "END revision history";

function getIndexContentLines(indexFilePath: string) {
    return fs.readFileSync(indexFilePath).toString().split("\n");
}

function matchesStart(line: string) {
    const pattern = new RegExp(`<!-- ${START_COMMENT}`);
    return pattern.test(line);
}

function matchesEnd(line: string) {
    const pattern = new RegExp(`<!-- ${END_COMMENT}`);
    return pattern.test(line);
}

function extractChangedChaptersFromCommit(specDir: string, commit: Commit) {
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
}

function findRevisionHistory(indexContentLines: string[]) {
    const startAt = indexContentLines.findIndex(matchesStart);
    const endAt = indexContentLines.findIndex(matchesEnd);
    const lines =
        startAt < 0 || endAt < 0
            ? []
            : // NOTE: slice revision history lines without start/end comments and table header
              indexContentLines.slice(startAt + 3, endAt - 1);

    return {
        startAt,
        endAt,
        lines,
    };
}

function updateIndexFileAndSave({
    indexFilePath,
    indexContentLines,
    startAt,
    endAt,
    revisionHistory,
}: {
    indexFilePath: string;
    indexContentLines: string[];
    startAt: number;
    endAt: number;
    revisionHistory: string[];
}) {
    const updatedContent = [
        ...indexContentLines.slice(0, startAt),
        "",
        `<!-- ${START_COMMENT} -->`,
        ...revisionHistory,
        `<!-- ${END_COMMENT} -->`,
        "",
        ...indexContentLines.slice(endAt + 1),
    ].join("\n");
    fs.writeFileSync(indexFilePath, updatedContent, "utf8");
    console.log(fs.readFileSync(indexFilePath).toString());
}

const composeTableRowLine = (row: string[]) => `|${row.join("|")}|`;

const generateHeaderLines = () => {
    return [HEADER, Array<string>(HEADER.length).fill("----")].map(
        composeTableRowLine
    );
};

const extractRowDataFromCommit = (commit: Commit["commit"]) => {
    return [
        "0.x", // TODO: auto-numbering → Think how?
        commit.author ? commit.author.date || "" : "",
        commit.author ? commit.author.name || "" : "",
        commit.message,
    ];
};

export const updateRevisionHistory = async ({
    prNumber,
    specDir,
}: UpdateRevisionHistoryOptions): Promise<void> => {
    const commits = await getRevisionHistoryCommitsOnPullRequest(prNumber);
    const commitsGroupedByChapter = commits.reduce(
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

    Object.keys(commitsGroupedByChapter).forEach((chapter) => {
        const newRevisionHistoryLines = commitsGroupedByChapter[chapter]
            .map(({ commit }) => extractRowDataFromCommit(commit))
            .map(composeTableRowLine);

        const indexFilePath = `${specDir}/${chapter}/_index.md`;
        const indexContentLines = getIndexContentLines(indexFilePath);
        const { startAt, endAt, lines } =
            findRevisionHistory(indexContentLines);

        updateIndexFileAndSave({
            indexFilePath,
            indexContentLines,
            startAt,
            endAt,
            revisionHistory: [
                ...generateHeaderLines(),
                ...lines,
                ...newRevisionHistoryLines,
            ],
        });
    });
};
