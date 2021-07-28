import glob from "glob";

export const findMarkdownFiles = (specDir: string) => {
    return glob.sync(`${specDir}/**/*.md`);
};
