import {InsightError} from "./IInsightFacade";

export function sortOrder(selectedSections: any[], orderKey: any): any[] {
    let sortedSections = selectedSections.sort((obj1, obj2) => {
        if (obj1[orderKey] > obj2[orderKey]) {
            return 1;
        }
        if (obj1[orderKey] < obj2[orderKey]) {
            return -1;
        }
        return 0;
    });
    return sortedSections;
}

export function sortTransform(transformedSections: any[], orderKey: any): any[] {
    let sortedSections = [];
    if (typeof orderKey === "string") {
        sortedSections = transformedSections.sort((obj1: any, obj2: any) => {
            if (obj1[orderKey] > obj2[orderKey]) {
                return 1;
            } else if (obj1[orderKey] < obj2[orderKey]) {
                return -1;
            }
            return 0;
        });
    } else {
        sortedSections = transformedSections.sort((obj1: any, obj2: any) => {
            for (let key of orderKey.keys) {
                if (obj1[key] !== obj2[key]) {
                    if (orderKey.dir === "UP") {
                        if (obj1[key] > obj2[key]) {
                            return 1;
                        } else if (obj1[key] < obj2[key]) {
                            return -1;
                        }
                    } else if (orderKey.dir === "DOWN") {
                        if (obj1[key] > obj2[key]) {
                            return -1;
                        } else if (obj1[key] < obj2[key]) {
                            return 1;
                        }
                    } else {
                        throw new InsightError("invalid dir");
                    }
                }
            }
        });
    }
    return sortedSections;
}
