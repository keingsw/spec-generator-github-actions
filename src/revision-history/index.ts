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

function groupFilenamesBySection({
    filenames,
    specDir,
}: {
    filenames: string[];
    specDir: string;
}) {
    return filenames
        .reduce(function (accumulator: string[], filename) {
            const section = path
                .dirname(path.relative(specDir, filename))
                .split("/")[0];
            if (accumulator.indexOf(section) < -1) {
                accumulator.push(section);
            }
            return accumulator;
        }, [])
        .filter((section) => !!section);
}

function extractChangedSectionsFromCommit(specDir: string, commit: Commit) {
    const { files = [] } = commit;
    console.log(commit);
    console.log(files);
    console.log(files.map(({ filename }) => filename || ""));
    const changedSections = groupFilenamesBySection({
        filenames: files.map(({ filename }) => filename || ""),
        specDir,
    });

    return changedSections;
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
        `<!-- ${START_COMMENT} ->`,
        ...revisionHistory,
        `<!-- ${END_COMMENT} ->`,
        "",
        ...indexContentLines.slice(endAt),
    ].join("\n");

    fs.writeFileSync(indexFilePath, updatedContent, "utf8");
}

const composeTableRowLine = (row: string[]) => `|${row.join("|")}|`;

const generateHeaderLines = () => {
    return [HEADER, Array<string>(HEADER.length).fill("----")].map(
        composeTableRowLine
    );
};

const extractRowDataFromCommit = (commit: Commit["commit"]) => {
    return [
        "0.x", // TODO: auto-numbering
        commit.author?.date ?? "",
        commit.author?.name ?? "",
        commit.message,
    ];
};

export const updateRevisionHistory = async ({
    prNumber,
    specDir,
}: UpdateRevisionHistoryOptions): Promise<void> => {
    const commits = await getRevisionHistoryCommitsOnPullRequest(prNumber);

    const commitsGroupedBySection: { [key: string]: Commit[] } = {};
    commits.forEach((commit) => {
        const changedSections = extractChangedSectionsFromCommit(
            specDir,
            commit
        );

        changedSections.forEach((section) =>
            (commitsGroupedBySection[section] =
                commitsGroupedBySection[section] || []).push(commit)
        );
    });
    console.log("commits", commits);
    console.log("commitsGroupedBySection", commitsGroupedBySection);

    Object.keys(commitsGroupedBySection).forEach((section) => {
        const newRevisionHistoryLines = commitsGroupedBySection[section]
            .map(({ commit }) => extractRowDataFromCommit(commit))
            .map(composeTableRowLine);

        const indexFilePath = `${specDir}/${section}/_index.md`;
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
