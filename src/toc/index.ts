import fs from "fs";
import path from "path";
import { transform } from "@technote-space/doctoc";
import { findSectionContentsFiles } from "../utils/fs";

interface GenerateTocResult extends ReturnType<typeof transform> {
    path: string;
}

interface UpdateTocOptions {
    specDir: string;
    sectionContentsFilename: string;
}

const getChaptersInOrder = (pageContentFilePath: string) => {
    const dirname = path.dirname(pageContentFilePath);
    const pages = fs.readFileSync(pageContentFilePath).toString().split("\n");
    return pages.map((pageName) => `${dirname}/${pageName}.md`);
};

const extractSectionTitleFromIndexContent = (indexFilePath: string) => {
    const firstH1 = fs
        .readFileSync(indexFilePath)
        .toString()
        .split("\n")
        .find((line) => /^#\s.+$/.test(line));
    return firstH1;
};

const generateChapterToc = (path: string): GenerateTocResult => {
    return {
        path,
        ...transform(fs.readFileSync(path, "utf8"), { isNotitle: true }),
    };
};

const generateTocPerSection = (sectionContentFile: string) => {
    const chaptersInSection = getChaptersInOrder(sectionContentFile);
    return chaptersInSection.map((chapter) => {
        return generateChapterToc(chapter);
    });
};

const updateChapterToc = ({ data, path }: GenerateTocResult) => {
    fs.writeFileSync(path, data, "utf8");
};

const updateSectionToc = (generateTocResults: GenerateTocResult[]) => {
    const dirname = path.dirname(generateTocResults[0].path);
    const indexFilePath = `${dirname}/_index.md`;

    const sectionToc = [
        extractSectionTitleFromIndexContent(indexFilePath),
        ...generateTocResults.map(({ toc }) => toc),
    ].join(`\n`);
    fs.writeFileSync(indexFilePath, sectionToc, "utf8");
};

export const updateToc = ({
    specDir,
    sectionContentsFilename,
}: UpdateTocOptions) => {
    const sectionContentsFiles = findSectionContentsFiles(
        specDir,
        sectionContentsFilename
    );

    sectionContentsFiles.forEach((sectionContentsFile) => {
        const results = generateTocPerSection(sectionContentsFile);
        const shouldUpdateSectionToc = !!results.find(
            ({ transformed }) => transformed
        );

        results.forEach((result) => {
            if (result.transformed) {
                updateChapterToc(result);
            }
        });

        if (shouldUpdateSectionToc) {
            updateSectionToc(results);
        }
    });
};
