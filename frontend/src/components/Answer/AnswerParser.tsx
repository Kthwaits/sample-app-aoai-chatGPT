import { AskResponse, Citation } from "../../api";
import { cloneDeep } from "lodash-es";


type ParsedAnswer = {
    citations: Citation[];
    markdownFormatText: string;
};

const enumerateCitations = (citations: Citation[]) => {
    const filepathMap = new Map();
    for (const citation of citations) {
        const { filepath } = citation;
        let part_i = 1
        if (filepathMap.has(filepath)) {
            part_i = filepathMap.get(filepath) + 1;
        }
        filepathMap.set(filepath, part_i);
        citation.part_index = part_i;
    }
    return citations;
}

export function parseAnswer(answer: AskResponse): ParsedAnswer {
    let answerText = answer.answer;
    const citationLinks = answerText.match(/\[(doc\d\d?\d?)]/g);

    const lengthDocN = "[doc".length;

    let filteredCitations = [] as Citation[];
    let citationReindex = 0;
    let citationTitles = new Map(); // to keep track of titles and their first occurrence index
    citationLinks?.forEach(link => {
        // Replacing the links/citations with number
        let citationIndex = link.slice(lengthDocN, link.length - 1);
        let citation = cloneDeep(answer.citations[Number(citationIndex) - 1]) as Citation;
        if (citation) {
            let index;
            if (citationTitles.has(citation.title)) {
                // If the title already exists, use the first occurrence index
                index = citationTitles.get(citation.title);
            } else {
                // If the title does not exist, increment citationReindex and use it
                index = ++citationReindex;
                citationTitles.set(citation.title, index);
                // Only add to filteredCitations if the title is unique
                citation.id = citationIndex; // original doc index to de-dupe
                citation.reindex_id = index.toString(); // reindex from 1 for display
                filteredCitations.push(citation);
            }
            answerText = answerText.replaceAll(link, ` ^${index}^ `);
        }
    })

    filteredCitations = enumerateCitations(filteredCitations);

    return {
        citations: filteredCitations,
        markdownFormatText: answerText
    };
}
