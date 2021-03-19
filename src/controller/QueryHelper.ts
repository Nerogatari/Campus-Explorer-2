import {isObject, isString} from "util";
import {InsightError} from "./IInsightFacade";
import Log from "../Util";
import {sortOrder, sortTransform} from "./SortHelper";

let mKeys: string[] = ["avg", "pass", "fail", "audit", "year", "lat", "lon", "seats"];
let sKeys: string[] = ["dept", "title", "instructor", "uuid", "id", "fullname", "shortname", "number", "name"
    , "address", "type", "furniture", "href"];
let optionKeys: string [] = ["COLUMNS", "ORDER"];
export function validQuery(query: any): boolean {
    let length: number = Object.keys(query).length;
    if (!("OPTIONS" in query)) {
        return false;
    }
    if (!("WHERE" in query)) {
        return false;
    }
    if (Object.keys(query.OPTIONS).length > 2) {
        return false;
    }
    if (!(length === 2 || (length === 3 && "TRANSFORMATIONS" in query))) {
        return false;
    }
    if (!(Array.isArray(query.OPTIONS["COLUMNS"]))) {
        return false;
    }
    if (!("COLUMNS" in query.OPTIONS)) {
        return false;
    }
    if ("ORDER" in query) {
        return query.OPTIONS["COLUMNS"].includes(["ORDER"]);
    }
    if (!isObject(query.OPTIONS)) {
        return false;
    }
    Object.keys(query.OPTIONS).forEach((val: string) => {
        if (!optionKeys.includes(val)) {
            return false;
        }
    });
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

export function orderHelper(orderKey: any, selectedSections: any[], query: any): any[] {
    if ((isString(orderKey)) && (!(orderKey === null))) {
        if (!query.OPTIONS["COLUMNS"].includes(orderKey)) {
            throw new InsightError("order keys not in the column");
        }
        let oKey: string = orderKey.split("_")[1];
        if (mKeys.includes(oKey) || sKeys.includes(oKey)) {
            return sortOrder(selectedSections, orderKey);
        } else {
            throw new InsightError("invalid key types");
        }
    } else if (typeof(orderKey.keys) === "object" || (orderKey.keys) !== null) {
        let dir: any = orderKey["dir"];
        let orderkeys: any[] = orderKey["keys"];
        if (orderkeys === undefined) {
            throw new InsightError("invalid orderkey");
        }
        if (!(query.OPTIONS["COLUMNS"].includes(orderkeys[0]))) {
            throw new InsightError("invalid orderkeys");
        }
        if (!(Array.isArray(orderkeys))) {
            throw new InsightError("order keys not array");
        }
        let i: number = orderkeys.length;
        if (dir !== "UP" && dir !== "DOWN") {
            throw new InsightError("wrong dir key");
        }
        if (i === 0) {
            throw new InsightError("length of order key should not be 1");
        }
        return sortTransform(selectedSections, orderKey);
    } else {
        throw new InsightError("wrong key type");
    }
}
