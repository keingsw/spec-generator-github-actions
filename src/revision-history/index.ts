import path from "path";
import {
    getRevisionHistoryCommitsOnPullRequest,
    Commit,
} from "../utils/github";
import { matchSection, updateSection } from "../utils/update-section";

interface UpdateRevisionHistoryOptions {
    prNumber: number;
    specDir: string;
    chapterIndexFilename: string;
}

const HEADER = ["改訂番号", "改訂日", "改訂者", "改訂内容"];
const START_COMMENT = "START revision history";
const END_COMMENT = "END revision history";

const matchesStart = (line: string) => {
    const pattern = new RegExp(`<!-- ${START_COMMENT}`);
    return pattern.test(line);
};

const matchesEnd = (line: string) => {
    const pattern = new RegExp(`<!-- ${END_COMMENT}`);
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
    return [
        "0.x", // TODO: auto-numbering → Think how?
        commit.author ? commit.author.date || "" : "",
        commit.author ? commit.author.name || "" : "",
        commit.message,
    ];
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
    prevRevisionHistory,
    newRevisionHistory,
}: {
    prevRevisionHistory: string[];
    newRevisionHistory: string[];
}) => {
    return [
        "",
        `<!-- ${START_COMMENT} -->`,
        ...composeHeaderLines(),
        ...prevRevisionHistory,
        ...newRevisionHistory,
        `<!-- ${END_COMMENT} -->`,
        "",
    ].join("\n");
};

export const updateRevisionHistory = async ({
    prNumber,
    specDir,
    chapterIndexFilename,
}: UpdateRevisionHistoryOptions): Promise<void> => {
    const commits = await getRevisionHistoryCommitsOnPullRequest(prNumber);
    const commitsGroupedByChapter = groupCommitsByChapter(specDir, commits);

    Object.keys(commitsGroupedByChapter).forEach((chapter) => {
        const newRevisionHistory = commitsGroupedByChapter[chapter]
            .map(({ commit }) => extractRowDataFromCommit(commit))
            .map(composeTableRowLine);

        const indexFilePath = `${specDir}/${chapter}/${chapterIndexFilename}`;
        const { startAt, endAt, matched } = matchSection({
            filePath: indexFilePath,
            matchesStart,
            matchesEnd,
        });

        updateSection({
            filePath: indexFilePath,
            startAt,
            endAt,
            newContent: composeRevisionHistory({
                // NOTE: Slice first 2 rows to remove header and division
                prevRevisionHistory: matched.slice(2),
                newRevisionHistory,
            }),
        });
    });
};
