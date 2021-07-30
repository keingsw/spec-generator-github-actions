import glob from "glob";

export const findMarkdownFiles = (dir: string) => {
    return glob.sync(`${dir}/**/*.md`);
};
