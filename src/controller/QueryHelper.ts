import {isArray, isObject, isString} from "util";
import {InsightError} from "./IInsightFacade";
import Log from "../Util";
import {sortOrder, sortTransform} from "./SortHelper";

let mKeys: string[] = ["avg", "pass", "fail", "audit", "year", "lat", "lon", "seats"];
let sKeys: string[] = ["dept", "title", "instructor", "uuid", "id", "fullname", "shortname", "number", "name"
    , "address", "type", "furniture", "href"];
let optionKeys: string [] = ["COLUMNS", "ORDER"];
export function validQuery(query: any): boolean {
    if (!query) {
        return false;
    }
    let length: number = Object.keys(query).length;
    if (!("OPTIONS" in query)) {
        return false;
    }
    if (!("WHERE" in query)) {
        return false;
    }
    if ((!(isObject(query.WHERE))) || isArray(query.WHERE)) {
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
    for (let val of Object.keys(query.OPTIONS)) {
        if (!optionKeys.includes(val)) {
            return false;
        }
    }
    if (Object.keys(query).includes("TRANSFORMATIONS")) {
        let transformations: any = query.TRANSFORMATIONS;
        if (!(isObject(transformations))) {
            return false;
        }
        if (validTransformations(transformations, query) === false) {
            return false;
        }
    }
    let columns: any[] = query.OPTIONS["COLUMNS"];
    return columns.length !== 0;
}

function validApply(transformations: any, query: any, groups: any) {
    let data;
    let actual;
    if (!("APPLY" in transformations)) {
        return false;
    }
    if (!isObject(transformations.APPLY)) {
        return false;
    }
    if (!transformations.APPLY) {
        return false;
    }
    if (transformations.APPLY.length  === 0) {
        return true;
    }
    if (!isObject(transformations.APPLY[0])) {
        return false;
    }
    if (!isObject(Object.values(query.TRANSFORMATIONS.APPLY[0])[0])) {
        return false;
    }
    if (! Object.values(Object.values(query.TRANSFORMATIONS.APPLY[0])[0])[0]) {
        return false;
    }
    if (!isString(Object.values(Object.values(query.TRANSFORMATIONS.APPLY[0])[0])[0])) {
        return false;
    }
    for (let groupKey of groups) {
        data = Object.values(Object.values(query.TRANSFORMATIONS.APPLY[0])[0])[0].split("_")[0];
        actual = groupKey.split("_")[0];
        if (data !== actual) {
            return false;
        }
    }
    return true;
}

export function validTransformations(transformations: any, query: any): boolean {
    let keys: any[] = Object.keys(transformations);
    let groups: any[] = transformations["GROUP"];
    if (keys.length === 0) {
        return false;
    }
    let data = "";
    let actual = "";
    if (keys.length > 2) {
        return false;
    }
    if (!("GROUP" in transformations)) {
        return false;
    }
    if (!(isObject(groups))) {
        return false;
    }
    if (!groups) {
        return false;
    }
    if (groups.length === 0) {
        return false;
    }
    for (let groupKey of groups) {
        if (!isString(groupKey)) {
            return false;
        } else {
            let checkKey = groupKey.split("_")[1];
            if ((!(mKeys.includes(checkKey))) && (!(sKeys.includes(checkKey)))) {
                return false;
            }
        }
    }
    if (!(validApply(transformations, query, groups))) {
        return false;
    }
    return true;
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
    if (orderKey === null) {
        throw new InsightError("orderKey should not be null");
    }
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
    } else if (typeof(orderKey.keys) === "object"  && (orderKey.keys) !== null) {
        let dir: any = orderKey["dir"];
        let orderkeys: any[] = orderKey["keys"];
        if (!orderkeys) {
            throw new InsightError("invalid orderkey");
        }
        if (!(Array.isArray(orderkeys))) {
            throw new InsightError("order keys not array");
        }
        for (let key of orderkeys) {
            if (!(query.OPTIONS["COLUMNS"].includes(key))) {
                throw new InsightError("invalid orderkeys");
            }
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
