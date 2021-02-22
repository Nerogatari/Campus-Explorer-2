import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind} from "./IInsightFacade";
import {InsightError, NotFoundError} from "./IInsightFacade";
import * as fs from "fs";
import {isArray} from "util";


/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {

    constructor() {
        Log.trace("InsightFacadeImpl::init()");
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        return Promise.reject("Not implemented.");
    }

    public removeDataset(id: string): Promise<string> {
        return Promise.reject("Not implemented.");
    }

    public performQuery(query: any): Promise<any[]> {
        // To fix the max 50 line, I removed options = query.OPTIONS
        let filter = query.WHERE;
        // TODO check query missing where, missing options, more than 2 fields
        let datasetID = query.OPTIONS.COLUMNS[0].split("_")[0];

        if (!this.validQuery(query)) {
            return Promise.reject(new InsightError("Invalid query"));
        }

        // TODO check filter, options' structure, columns empty array

        // get dataset by id--use fs.readFileSync
        let sections = this.getDatasetById(datasetID); // let section store dataset id
        let filteredSections = []; // applied filter sections

        if (!Object.keys(filter)) {
            filteredSections = sections;
        } else if (Object.keys(filter).length === 1) {
            // pass dataset and filter and return sections
            filteredSections = this.performFilter(sections, filter, datasetID);
            let columns = query.OPTIONS.COLUMNS;

            const selectedSections = filteredSections.map((section: any) => {
            let newSection: any = {};
            columns.forEach((key: string) => {
                const column = key.split("_")[1]; // TODO: check columns key has "_", check cross dataset
                newSection[key] = section[column];
                if (!column === query.OPTIONS.COLUMNS[0].split("_")[1]) {
                    return Promise.reject(new InsightError("Cross dataset"));
                }
                });
            return newSection;
            });

            const orderKey = query.OPTIONS.ORDER;

            let sortedSections = selectedSections.sort((obj1, obj2) => {
                if (obj1[orderKey] > obj2[orderKey]) {
                    return 1;
                }
                if (obj1[orderKey] < obj2[orderKey]) {
                    return -1;
                }
                return 0;
            });
            // TODO check length >5000
            if (sortedSections.length < 5000) {
                return Promise.resolve(sortedSections);
            } else {
                return Promise.reject(new InsightError("length > 5000"));
            }
        } else {
            return Promise.reject(new InsightError(("More than one filter in WHERE")));
        }
    }

    private validQuery(query: any) {
        let length: number = Object.keys(query).length;
        if (!("WHERE" in query)) {
            return false;
        }
        if (!("OPTIONS" in query)) {
            return false;
        }
        if (!(length === 2)) {
            return false;
        }
        if (!("COLUMNS" in query.OPTIONS)) {
            return false;
        }
        let columns: any[] = query.OPTIONS["COLUMNS"];
        if (columns.length === 0) {
            return false;
        }
        // maybe check if it is array?
    }

    private getDatasetById (id: string): any[] {
        let retval: any[] = [];
        fs.readdirSync("./data/").forEach((filename) => {
            // read file sync return array.
            if (id === filename) {
                const fileContent = fs.readFileSync("./data/" + filename, "utf8");
                let fileID = JSON.parse(fileContent).id;
                if (fileID === id) {
                    retval = JSON.parse(fileContent)["data"];
                }
            }
        });
        if (retval === []) {
            throw new InsightError("Nothing in dataset");
        } else {
            return retval;
        }
    }

    public listDatasets(): Promise<InsightDataset[]> {
        return Promise.reject("Not implemented.");
    }


    private performFilter(filter: object, sections: object[], id: string): object[] {

        let retval = sections.filter((section) => {
            return this.isSatisfied(filter, section, id);
        });

        return retval;

    }

    private isSatisfied(filter: any, section: any, id: string): boolean {

        let operationArr = Object.keys(filter);
        let filterArr: any[] = filter[operationArr[0]];

        if (operationArr.length !== 1) {
            throw new InsightError("Number of filter key is not 1");
        } else {
            switch (operationArr[0]) {
                case "NOT":
                    return !this.isSatisfied(filter.NOT, section, id);

                case "AND": // TODO: check empty array
                    if (filterArr.length === 0) {
                        throw new InsightError("empty array");
                    }
                    let resultAND = true;
                    for (let obj of filter.AND) {
                        if (this.isSatisfied(obj, section, id) === false) {
                            resultAND = false;
                        }
                    }
                    return resultAND;
                case "OR":
                    if (filterArr.length === 0) {
                        throw new InsightError("empty array");
                    }
                    let resultOR = false;
                    for (let obj of filter.OR) {
                        if (this.isSatisfied(obj, section, id) === true) {
                            resultOR = true;
                        }
                    }
                    return resultOR;
                case "IS"  :
                    return this.IScomparator(filter, section, id);
                case "LT":
                    return this.LTcomparator(filter, section, id);
                case "GT":
                    return this.GTcomparator(filter, section, id);
                case "EQ":
                    return this.EQcomparator(filter, section, id);
                default:
                     throw new InsightError("Invalid comparator name");

            }
        }
    }
    private mkeys = ["avg", "pass", "fail", "audit", "year"];
    private skeys = ["dept", "id", "instructor", "title", "uuid"];

    private LTcomparator(filter: any, section: any, id: string) {
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
        if (this.mkeys.indexOf(filterKey) === -1) {
            throw new InsightError("filter  key is not a m key");
        }

        if (typeof queryValue === "number") {
            return (sectionValue < queryValue);
        } else {
            throw new InsightError("compared value is not number");
        }
    }

    private GTcomparator(filter: any, section: any, id: string) {
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
        if (this.mkeys.indexOf(filterKey) === -1) {
            throw new InsightError("filter  key is not a m key");
        }

        if (typeof queryValue === "number") {
            return (sectionValue > queryValue);
        } else {
            throw new InsightError("compared value is not number");
        }
    }

    private EQcomparator(filter: any, section: any, id: string) {
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
        if (this.mkeys.indexOf(filterKey) === -1) {
            throw new InsightError("filter  key is not a m key");
        }

        if (typeof queryValue === "number") {
            return (sectionValue === queryValue);
        } else {
            throw new InsightError("compared value is not number");
        }
    }

    private IScomparator(filter: any, section: any, id: string) {
        return false;
    }
}
