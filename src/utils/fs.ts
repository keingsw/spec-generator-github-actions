import glob from "glob";

export const findMarkdownFiles = (
    specDir: string,
    chapterContentsFilename: string
) => {
    return glob
        .sync(`${specDir}/**/*.md`)
        .filter((file) => !file.includes(`${chapterContentsFilename}.md`));
};

export const findChapterContentsFiles = (
    specDir: string,
    chapterContentsFilename: string
) => {
    return glob.sync(`${specDir}/**/${chapterContentsFilename}.md`);
};
