import glob from "glob";

export const findMarkdownFiles = (
    specDir: string,
    sectionContentsFilename: string
) => {
    return glob
        .sync(`${specDir}/**/*.md`)
        .filter((file) => !file.includes(`${sectionContentsFilename}.md`));
};

export const findSectionContentsFiles = (
    specDir: string,
    sectionContentsFilename: string
) => {
    return glob.sync(`${specDir}/**/${sectionContentsFilename}.md`);
};
