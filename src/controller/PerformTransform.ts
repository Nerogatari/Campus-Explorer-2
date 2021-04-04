import Log from "../Util";
import {Decimal} from "decimal.js";
import {InsightError} from "./IInsightFacade";
let mKeys: string[] = ["avg", "pass", "fail", "audit", "year", "lat", "lon", "seats"];
let sKeys: string[] = ["dept", "title", "instructor", "uuid", "id", "fullname", "shortname", "number", "name"
    , "address", "type", "furniture", "href"];

function validApplys(transform: any) {
    if (transform.APPLY === null) {
        return false;
    }
    if (!(Array.isArray(transform.APPLY))) {
        return false;
    } else {
        return true;
    }
}

function validApply(applyKey: string, applyRule: any) {
    if (!applyKey) {
        return false;
    }
    if (applyRule === null) {
        return false;
    }
    if (applyKey.includes("_")) {
        return false;
    } else {
        return true;
    }
}

export function performTransform(sections: object[], transform: any, id: string): any {
    let mappedGroup: Map<string, any[]> = new Map<string, any[]>();
    if (!("GROUP" in transform)) {
        throw new InsightError("no group");
    }
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
        if (!(validApplys(transform))) {
            throw new InsightError("invalaid apply");
        }
        for (let apply1 of transform.APPLY) {
            let applyKey = Object.keys(apply1)[0];
            let applyRule = apply1[applyKey];
            if (!(validApply(applyKey, applyRule))) {
                throw new InsightError("invalid applyKey/rule");
            }
            if ((Object.keys(apply1).length) !== 1) {
                throw new InsightError("apply key should only have 1 key");
            }
            let arr = Object.values(applyRule);
            let unique = [...new Set(arr)];
            if (!(arr.length  === unique.length)) {
                throw new InsightError("duplicated apply key");
            }
            groupedSection[applyKey] = executeApply(currGroup, applyRule);
        }
        groupedSections.push(groupedSection);
    }
    return groupedSections;
}
const executeApply = (currGroup: any, applyRule: any): number => {
    if ((Object.keys(applyRule).length) !== 1 || applyRule === undefined) {
        throw new InsightError("invalid apply rule");
    }
    let applyToken = Object.keys(applyRule)[0];
    let key = applyRule[applyToken];
    let mainKey = key.split("_")[1];
    let dataArray = currGroup.map((section: any) => {
        return section[key];
    });
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
            let returnNumber = Number(avg.toFixed(2));
            return returnNumber;
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
