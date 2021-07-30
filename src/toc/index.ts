import fs from "fs";
import path from "path";
import glob from "glob";
import { transform } from "@technote-space/doctoc";
import { updateSection } from "../utils/update-section";
import * as inputs from "../utils/inputs";

interface GenerateTocResult extends ReturnType<typeof transform> {
    filePath: string;
}

const matchesStart = (line: string) => {
    const { start } = inputs.getTocSectionRegExp();
    return start.test(line);
};

const matchesEnd = (line: string) => {
    const { end } = inputs.getTocSectionRegExp();
    return end.test(line);
};

const findChapterContentsFiles = () => {
    const specDir = inputs.getSpecDir();
    const chapterContentsFilename = inputs.getChapterContentsFilename();
    return glob.sync(`${specDir}/**/${chapterContentsFilename}`);
};

const getSectionsInOrder = (chapterContentFilePath: string) => {
    const dirname = path.dirname(chapterContentFilePath);
    const sections = fs
        .readFileSync(chapterContentFilePath)
        .toString()
        .split("\n");
    return sections.map((sectionName) => `${dirname}/${sectionName}.md`);
};

const generateSectionToc = (filePath: string): GenerateTocResult => {
    return {
        filePath,
        ...transform(fs.readFileSync(filePath, "utf8"), { isNotitle: true }),
    };
};

const generateTocPerChapter = (chapterContentFile: string) => {
    const sectionsInChapter = getSectionsInOrder(chapterContentFile);
    return sectionsInChapter.map((section) => {
        return generateSectionToc(section);
    });
};

const wrapTocWithAnchorComment = (toc: string) => {
    const tocSectionMdComments = inputs.getTocSectionMdComments();
    return [tocSectionMdComments.start, toc, tocSectionMdComments.end].join(
        "\n"
    );
};

const updateSectionToc = ({ toc, filePath }: GenerateTocResult) => {
    const content = fs.readFileSync(filePath, "utf8").toString();
    const updatedContent = updateSection({
        content,
        matchesStart,
        matchesEnd,
        newContent: wrapTocWithAnchorComment(toc),
    });
    fs.writeFileSync(filePath, updatedContent, "utf8");
};

const updateChapterToc = (generateTocResults: GenerateTocResult[]) => {
    const dirname = path.dirname(generateTocResults[0].filePath);
    const chapterIndexFilename = inputs.getChapterIndexFilename();
    const indexFilePath = `${dirname}/${chapterIndexFilename}`;

    const content = fs.readFileSync(indexFilePath, "utf8").toString();

    const updatedContent = updateSection({
        content,
        matchesStart,
        matchesEnd,
        newContent: wrapTocWithAnchorComment(
            generateTocResults.map(({ toc }) => toc).join("\n")
        ),
    });
    fs.writeFileSync(indexFilePath, updatedContent, "utf8");
};

export const updateToc = () => {
    const chapterContentsFiles = findChapterContentsFiles();

    chapterContentsFiles.forEach((chapterContentsFile) => {
        const results = generateTocPerChapter(chapterContentsFile);
        const shouldUpdateChapterToc = !!results.find(
            ({ transformed }) => transformed
        );

        results.forEach((result) => {
            if (result.transformed) {
                updateSectionToc(result);
            }
        });

        if (shouldUpdateChapterToc) {
            updateChapterToc(results);
        }
    });
};
