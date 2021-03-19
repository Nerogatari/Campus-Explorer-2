import {isObject} from "util";
import {InsightError} from "./IInsightFacade";

let mKeys: string[] = ["avg", "pass", "fail", "audit", "year", "lat", "lon", "seats"];
let sKeys: string[] = ["dept", "title", "instructor", "uuid", "id", "fullname", "shortname", "number", "name"
    , "address", "type", "furniture", "href"];

export function validQuery(query: any): boolean {
    let length: number = Object.keys(query).length;
    if (!("WHERE" in query)) {
        return false;
    }
    if (!("OPTIONS" in query)) {
        return false;
    }
    if (Object.keys(query.OPTIONS).length > 2) {
        return false;
    }
    if (!(length === 2 || length === 3)) {
        return false;
    }
    if (!("COLUMNS" in query.OPTIONS)) {
        return false;
    }
    if ("ORDER" in query) {
        return query.OPTIONS["COLUMNS"].includes(["ORDER"]);
    }
    let columns: any[] = query.OPTIONS["COLUMNS"];
    return columns.length !== 0;
    if (Object.keys(query).includes("TRANSFORMATIONS")) {
        let transformations: any = query.TRANSFORMATIONS;
        if (!(isObject(transformations))) {
            return false;
        }
        if (validTransformations(transformations)) {
            return false;
        }
    }
    //  TODO sorting when order is empty?
    return true; // remove this
}

export function validTransformations(transformations: any): boolean {
    let keys: any[] = Object.keys(transformations);
    let groups: any[] = transformations["GROUP"];
    if (keys.length === 0) {
        return false;
    }
    if (keys.length > 2) {
        return false;
    }
    if (!("GROUP" in transformations)) {
        return false;
    }
    if (groups.length === 0) {
        return false;
    }
    for (let groupKey of groups) {
        let checkKey = groupKey.split("_")[1];
        if ((!(mKeys.includes(checkKey))) && (!(sKeys.includes(checkKey)))) {
            return false;
        }
    }
    if (!("APPLY" in transformations)) {
        return false;
    }
}

export function performSelect(transformedSection: any[], columns: any[], query: any) {
    let selectedSections;
    selectedSections = transformedSection.map((section: any) => {
        let newSection: any = {};
        columns.forEach((key: string) => {
            if (section[key] === undefined) {
                throw new InsightError("column key should not be undefined");
            }
            newSection[key] = section[key];
            if (!key === query.OPTIONS.COLUMNS[0]) {
                throw new InsightError("Cross dataset");
            }
        });
        return newSection;
    });
    return selectedSections;
}
