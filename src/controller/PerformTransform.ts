import Log from "../Util";
import Decimal from "decimal.js";
import {InsightError} from "./IInsightFacade";
let mKeys: string[] = ["avg", "pass", "fail", "audit", "year", "lat", "lon", "seats"];
let sKeys: string[] = ["dept", "title", "instructor", "uuid", "id", "fullname", "shortname", "number", "name"
    , "address", "type", "furniture", "href"];

export function performTransform(sections: object[], transform: any, id: string): any {

    let mappedGroup: Map<string, any[]> = new Map<string, any[]>();
    let groupKeys = transform.GROUP;
    for (let section of sections) {
        let mapKey = "";
        for (let groupKey of groupKeys) {
            mapKey += String((section as any)[groupKey]);
        }
        if (mappedGroup.has(mapKey)) {
            mappedGroup.get(mapKey).push(section);
        } else {
            mappedGroup.set(mapKey, [section]);
        }
    }
    let groupedSections = [];
    for (let currGroup of mappedGroup.values()) {
        let groupedSection: any = {};
        for (let groupKey of transform.GROUP) {
            groupedSection[groupKey] = currGroup[0][groupKey];
        }
        if (transform.APPLY === null) {
            throw new InsightError("empty APPLY");
        }
        if (!(Array.isArray(transform.APPLY))) {
            throw new InsightError("apply not array");
        }
        for (let apply1 of transform.APPLY) {
            let applyKey = Object.keys(apply1)[0];
            let applyRule = apply1[applyKey];
            if (applyKey.includes("_")) {
                throw new InsightError("apply key should not contain _");
            }
            if ((Object.keys(apply1).length) !== 1) {
                throw new InsightError("apply key should only have 1 key");
            }
            groupedSection[applyKey] = executeApply(currGroup, applyRule);
        }
        groupedSections.push(groupedSection);
    }
    return groupedSections;
}

// TODO: parameter of dataKind
const executeApply = (currGroup: any, applyRule: any): number => {
    let applyToken = Object.keys(applyRule)[0];
    let key = applyRule[applyToken];
    let mainKey = key.split("_")[1];
    let dataArray = currGroup.map((section: any) => {
        return section[key];
    });
    if ((Object.keys(applyRule).length) !== 1) {
        throw new InsightError("applyToken length should be 1");
    }
    if ((!(mKeys.includes(mainKey))) && (!(sKeys.includes(mainKey)))) {
        throw new InsightError("target string is not valid");
    }
    if (applyToken !== "COUNT") {
        if (!(mKeys.includes(mainKey))) {
            throw new InsightError("should only act on numbers");
        }
    }
    switch (applyToken) {
        case "SUM":
            let sum = dataArray.reduce((retval: any, value: any) => {
                return retval + value;
            });
            return Number(sum.toFixed(2));
        case "AVG":
            let totalDecimal = dataArray.map((num: any) => {
                return new Decimal(num);
            });
            let sum2 = totalDecimal.reduce((retval1: any, value1: any) => {
                return retval1.add(value1);
            });
            let avg = sum2 / dataArray.length;
            return Number(avg.toFixed(2));
        case "COUNT":
            // https://stackoverflow.com/questions/1960473/get-all-unique-values-in-a-javascript-array-remove-duplicates
            let unique = [...new Set(dataArray)];
            return unique.length;
        case "MAX":
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/max
            return Math.max(... dataArray);
        case "MIN":
            return Math.min(... dataArray);
        default:
            throw new InsightError("Invalid token name");
    }
};
