import * as core from "@actions/core";

const escapeRegExp = (patternString: string) =>
    patternString.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");

const createRegExp = (patternString: string) => new RegExp(patternString);

export const wrapInMdComment = (string: string) => `[${string}]: <>`;

export const getAccessToken = () => core.getInput("accessToken");

export const getOwnerAndRepo = () => {
    const [owner, repo] = core.getInput("repository").split("/");
    return { owner, repo };
};

export const getSpecDir = () => core.getInput("specDir");

export const getChapterContentsFilename = () =>
    core.getInput("chapterContentsFilename");

export const getChapterIndexFilename = () =>
    core.getInput("chapterIndexFilename");

export const getOutputFilePath = () => core.getInput("outputFilePath");

export const getWorkingBranchName = () => {
    const [branchName] = core.getInput("branchRef").split("/").slice(-1);
    return branchName;
};

export const getRevisionCommitRegExp = () =>
    createRegExp(core.getInput("revisionCommitRegExp"));

export const getRevisionHistorySectionMdComments = () => ({
    start: wrapInMdComment(core.getInput("revisionHistorySectionStart")),
    end: wrapInMdComment(core.getInput("revisionHistorySectionEnd")),
});

export const getRevisionHistorySectionRegExp = () => {
    const { start, end } = getRevisionHistorySectionMdComments();
    return {
        start: createRegExp(`^${escapeRegExp(start)}`),
        end: createRegExp(`^${escapeRegExp(end)}`),
    };
};
export const getTocSectionMdComments = () => ({
    start: wrapInMdComment(core.getInput("tocSectionStart")),
    end: wrapInMdComment(core.getInput("tocSectionEnd")),
});

export const getTocSectionRegExp = () => {
    const { start, end } = getTocSectionMdComments();
    return {
        start: createRegExp(`^${escapeRegExp(start)}`),
        end: createRegExp(`^${escapeRegExp(end)}`),
    };
};
