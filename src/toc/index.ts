import fs from "fs";
import path from "path";
import glob from "glob";
import { transform } from "@technote-space/doctoc";
import { matchSection, updateSection } from "../utils/update-section";

interface GenerateTocResult extends ReturnType<typeof transform> {
    path: string;
}

interface UpdateTocOptions {
    specDir: string;
    chapterIndexFilename: string;
    chapterContentsFilename: string;
}

const START_COMMENT = "START toc";
const END_COMMENT = "END toc";

const matchesStart = (line: string) => {
    const pattern = new RegExp(`[${START_COMMENT}]: <>`);
    return pattern.test(line);
};

const matchesEnd = (line: string) => {
    const pattern = new RegExp(`[${END_COMMENT}]: <>`);
    return pattern.test(line);
};

const findChapterContentsFiles = (
    specDir: string,
    chapterContentsFilename: string
) => {
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

const generateSectionToc = (path: string): GenerateTocResult => {
    return {
        path,
        ...transform(fs.readFileSync(path, "utf8"), { isNotitle: true }),
    };
};

const generateTocPerChapter = (chapterContentFile: string) => {
    const sectionsInChapter = getSectionsInOrder(chapterContentFile);
    return sectionsInChapter.map((section) => {
        return generateSectionToc(section);
    });
};

const wrapTocWithAnchorComment = (toc: string) => {
    return ["", `[${START_COMMENT}]: <>`, toc, `[${END_COMMENT}]: <>`, ""].join(
        "\n"
    );
};

const updateSectionToc = ({ toc, path }: GenerateTocResult) => {
    const { startAt, endAt } = matchSection({
        filePath: path,
        matchesStart,
        matchesEnd,
    });

    updateSection({
        filePath: path,
        startAt,
        endAt,
        newContent: wrapTocWithAnchorComment(toc),
    });
};

const updateChapterToc = (
    chapterIndexFilename: string,
    generateTocResults: GenerateTocResult[]
) => {
    const dirname = path.dirname(generateTocResults[0].path);
    const indexFilePath = `${dirname}/${chapterIndexFilename}`;

    const { startAt, endAt } = matchSection({
        filePath: indexFilePath,
        matchesStart,
        matchesEnd,
    });

    updateSection({
        filePath: indexFilePath,
        startAt,
        endAt,
        newContent: wrapTocWithAnchorComment(
            generateTocResults.map(({ toc }) => toc).join("\n")
        ),
    });
};

export const updateToc = ({
    specDir,
    chapterIndexFilename,
    chapterContentsFilename,
}: UpdateTocOptions) => {
    const chapterContentsFiles = findChapterContentsFiles(
        specDir,
        chapterContentsFilename
    );

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
            updateChapterToc(chapterIndexFilename, results);
        }
    });
};
