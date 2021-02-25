import {InsightError} from "./IInsightFacade";
import {isString} from "util";

export default class PerformQueryHelper {
    private mkeys = ["avg", "pass", "fail", "audit", "year"];
    private skeys = ["dept", "id", "instructor", "title", "uuid"];

    public LTcomparator(filter: any, section: any, id: string) {
        let filterKey: string = "";
        let datasetID: string = "";
        let key: string = "";

        try {
            filterKey = Object.keys(filter.LT)[0];
            datasetID = filterKey.split("_")[0];
            key = filterKey.split("_")[1];
        } catch (e) {
            throw new InsightError("LT key number is not 1");
        }
        if (datasetID !== id) {
            throw new InsightError("Cross dataset");
        }
        const queryValue = filter.LT[filterKey];
        const sectionValue = section[key];

        if (this.mkeys.indexOf(key) === -1) {
            if (this.skeys.indexOf(key) === -1) {
                throw new InsightError("invalid key type");
            }
            throw new InsightError("filter  key is not a m key");
        }
        if (typeof queryValue === "number") {
            return (sectionValue < queryValue);
        } else {
            throw new InsightError("compared value is not number");
        }
    }

    public GTcomparator(filter: any, section: any, id: string) {
        let filterKey: string = "";
        let datasetID: string = "";
        let key: string = "";

        try {
            filterKey = Object.keys(filter.GT)[0];
            datasetID = filterKey.split("_")[0];
            key = filterKey.split("_")[1];
        } catch (e) {
            throw new InsightError("GT key number is not 1");
        }
        if (datasetID !== id) {
            throw new InsightError("Cross dataset");
        }
        const queryValue = filter.GT[filterKey];
        const sectionValue = section[key];
        if (this.mkeys.indexOf(key) === -1) {
            if (this.skeys.indexOf(key) === -1) {
                throw new InsightError("invalid key type");
            }
            throw new InsightError("filter  key is not a m key");
        }

        if (typeof queryValue === "number") {
            return (sectionValue > queryValue);
        } else {
            throw new InsightError("compared value is not number");
        }
    }

    public EQcomparator(filter: any, section: any, id: string) {
        let filterKey: string = "";
        let datasetID: string = "";
        let key: string = "";

        try {
            filterKey = Object.keys(filter.EQ)[0];
            datasetID = filterKey.split("_")[0];
            key = filterKey.split("_")[1];
        } catch (e) {
            throw new InsightError("EQ key number is not 1");
        }
        if (datasetID !== id) {
            throw new InsightError("Cross dataset");
        }
        const queryValue = filter.EQ[filterKey];
        const sectionValue = section[key];
        if (this.mkeys.indexOf(key) === -1) {
            if (this.skeys.indexOf(key) === -1) {
                throw new InsightError("invalid key type");
            }
            throw new InsightError("filter key is not a m key");
        }

        if (typeof queryValue === "number") {
            return (sectionValue === queryValue);
        } else {
            throw new InsightError("compared value is not number");
        }
    }

    public IScomparator(filter: any, section: any, id: string) {
        let filterKey: string = "";
        let datasetID: string = "";
        let key: string = "";

        try {
            filterKey = Object.keys(filter.IS)[0];
            datasetID = filterKey.split("_")[0];
            key = filterKey.split("_")[1];
        } catch (e) {
            throw new InsightError("IS key number is not 1");
        }
        if (datasetID !== id) {
            throw new InsightError("Cross dataset");
        }
        const queryValue = filter.IS[filterKey];
        const sectionValue = section[key];
        if (this.skeys.indexOf(key) === -1) {
            if (this.mkeys.indexOf(key) === -1) {
                throw new InsightError("invalid key type");
            }
            throw new InsightError("filter key is not an s key");
        }


        if (typeof queryValue === "string") {
            let queryLength = queryValue.length;
            let sectLength = sectionValue.length;
            if (sectionValue.substring(1, sectLength - 1).includes("*")) {
                throw new InsightError("* in the middle");
            }
            if (sectionValue === "*" || sectionValue === "**") {
                return true;
            } else if (sectionValue.indexOf("*") === -1) {
                return (sectionValue === queryValue);
            } else if (sectionValue.startsWith("*") && (!sectionValue.endsWith("*"))) {
                return (queryValue.substring(1).includes(sectionValue.substring(1)));
            } else if (sectionValue.endsWith("*") && (!sectionValue.startsWith("*"))) {
                return (queryValue.substring(0, queryLength - 1)).includes(sectionValue.substring(0, sectLength - 1));
            } else if (sectionValue.startsWith("*") && (sectionValue.endsWith("*"))) {
                return (queryValue.substring(1, queryLength - 1)).includes(sectionValue.substring(1, sectLength - 1));
            } else {
                throw new InsightError("* is in the middle");
            }
            // TODO check * in the middle,

        } else {
            throw new InsightError("compared value is not string");
        }

    }
    // public Sort(section: any, orderKey: any) {
    //     let Sort: any[] = [];
    //     if (!orderKey === null) {
    //         if (typeof(orderKey) === "string") {Sort.sort((obj1, obj2) => {
    //             if (obj1[orderKey] > obj2[orderKey]) {
    //                 return 1;
    //             }
    //             if (obj1[orderKey] < obj2[orderKey]) {
    //                 return -1;
    //             }
    //             return 0;
    //         });
    //         }
    //     }
    //     return Sort;
    // }
}


