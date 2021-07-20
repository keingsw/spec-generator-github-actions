import fs from 'fs';
import path from 'path';
import glob from 'glob';
import {transform} from '@technote-space/doctoc';

interface GenerateTocResult extends ReturnType<typeof transform> {
    path: string
}

// TODO: take these as options from input
const SPEC_DIR = "./sample-spec";
const SECTION_CONTENTS_FILENAME = `_contents`;

const findSectionContentsFiles = (specDir: string) => {
    return glob.sync(`${specDir}/**/${SECTION_CONTENTS_FILENAME}.md`);
}

const getChaptersInOrder = (pageContentFilePath: string) => {
    const dirname = path.dirname(pageContentFilePath);
    const pages = fs.readFileSync(pageContentFilePath).toString().split("\n");
    return pages.map(pageName => `${dirname}/${pageName}.md`);
}

const generateChapterToc = (path: string): GenerateTocResult => {
    return {path, ...transform(fs.readFileSync(path, 'utf8'), {isNotitle: true})};
}

const generateTocPerSection= (sectionContentFile: string) => {
    const chaptersInSection = getChaptersInOrder(sectionContentFile);
    return chaptersInSection.map(chapter => {
        return generateChapterToc(chapter);
    })
}

const updateChapterToc = ({data, path}: GenerateTocResult) => {
    fs.writeFileSync(path, data, 'utf8');
}

export const updateToc = () => {
    const sectionContentsFiles = findSectionContentsFiles(SPEC_DIR);
    sectionContentsFiles.forEach(sectionContentsFile => {
        const results = generateTocPerSection(sectionContentsFile);

        results.forEach((result) => {
            if (result.transformed){
                updateChapterToc(result);
            }
        })
    });
}
