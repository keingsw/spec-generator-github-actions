import fs from "fs";

function getFileContentLines(filePath: string) {
    return fs.readFileSync(filePath, "utf8").toString().split("\n");
}

export function matchSection({
    filePath,
    matchesStart,
    matchesEnd,
}: {
    filePath: string;
    matchesStart: (line: string) => boolean;
    matchesEnd: (line: string) => boolean;
}) {
    const contentLines = getFileContentLines(filePath);
    const startAt = contentLines.findIndex(matchesStart);
    const endAt = contentLines.findIndex(matchesEnd);
    const matched =
        startAt < 0 || endAt < 0 ? [] : contentLines.slice(startAt + 1, endAt);

    return {
        startAt,
        endAt,
        matched,
        contentLines,
    };
}

export function updateSection({
    filePath,
    startAt,
    endAt,
    newContent,
}: {
    filePath: string;
    startAt: number;
    endAt: number;
    newContent: string;
}) {
    const contentLines = getFileContentLines(filePath);
    const updatedContent = [
        ...contentLines.slice(0, startAt),
        newContent,
        ...contentLines.slice(endAt + 1),
    ].join("\n");

    fs.writeFileSync(filePath, updatedContent, "utf8");
}
