import fs from "fs";

export const matchSection = ({
    content,
    matchesStart,
    matchesEnd,
}: {
    content: string;
    matchesStart: (line: string) => boolean;
    matchesEnd: (line: string) => boolean;
}) => {
    const contentLines = content.split("\n");
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
};

export const updateSection = ({
    content,
    matchesStart,
    matchesEnd,
    newContent,
}: {
    content: string;
    matchesStart: (line: string) => boolean;
    matchesEnd: (line: string) => boolean;
    newContent: string;
}) => {
    const { startAt, endAt, contentLines } = matchSection({
        content,
        matchesStart,
        matchesEnd,
    });

    return [
        ...contentLines.slice(0, startAt),
        newContent,
        ...contentLines.slice(endAt + 1),
    ].join("\n");
};
