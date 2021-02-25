import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind, ResultTooLargeError} from "./IInsightFacade";
import {InsightError, NotFoundError} from "./IInsightFacade";
import * as fs from "fs";
import PerformQueryHelper from "./performQueryHelper";
import * as JSZip from "jszip";

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
        // let zip = new JSZip();
        // let dataToSave = [];
        // let coursesPromises: Array<Promise<any>> = [];
        // return zip.loadAsync(content, {base64: true}).then((zipObject) => {
        //
        //     const files = zipObject.folder("courses");
        //
        //     files.forEach((relativePath, file) => {
        //         if (relativePath !== ".DS_Store") {
        //             coursesPromises.push(this.getSections(file)); }
        //     });
        //
        //     Log.trace(coursesPromises);
        //
        //     return Promise.all(coursesPromises).then((results) => {
        //         Log.trace(results);
        //         return Promise.reject("not finished ye hehe");
        //
        //     });
        // });
        return Promise.reject("not finished ye hehe");
    }

    private getSections(file: JSZip.JSZipObject): Promise<any> {
        // return new Promise((resolve, reject) => {
        //
        //     let retval: object[] = [];
        //     file.async("text").then((content) => {
        //         try {
        //             const sections = JSON.parse(content).result;
        //
        //             sections.forEach((section: { Subject: string, Course: string,
        //                 Year: string,
        //
        //             }) => {
        //                 let sectionForDs = {
        //                     dept: section.Subject.toString(),
        //                     id: section.Course,
        //                     year: Number(section.Year),
        //                 };
        //                 retval.push(sectionForDs);
        //             });
        //             resolve(retval);
        //         } catch (e) {
        //             return;
        //         }
        //     });
        // });
        return Promise.reject("not finished ye hehe");
    }

    public removeDataset(id: string): Promise<string> {
        return Promise.reject("Not implemented.");
    }

    public performQuery(query: any): Promise<any[]> {
        if (!this.validQuery(query)) {
            return Promise.reject(new InsightError("Invalid query"));
        }

        let filter = query.WHERE;
        // TODO check query missing where, missing options, more than 2 fields
        let datasetID = query.OPTIONS.COLUMNS[0].split("_")[0];
        // TODO check filter, options' structure, columns empty array

        let sections = this.getDatasetById(datasetID); // let section store dataset id
        let filteredSections = []; // applied filter sections
        if (!Object.keys(filter)) {
            filteredSections = sections;
        } else if (Object.keys(filter).length === 1) {
            // pass dataset and filter and return sections
            filteredSections = this.performFilter(sections, filter, datasetID);
            let columns = query.OPTIONS.COLUMNS;
            let selectedSections = filteredSections.map((section: any) => {
                let newSection: any = {};
                columns.forEach((key: string) => {
                    if (key.indexOf("_") !== -1) {
                        const column = key.split("_")[1];
                        newSection[key] = section[column];
                        if (!column === query.OPTIONS.COLUMNS[0].split("_")[1]) {
                            return Promise.reject(new InsightError("Cross dataset"));
                        }
                    } else {
                        return Promise.reject("columns key does not contain _");
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
                return Promise.reject(new ResultTooLargeError("length > 5000"));
            }
        } else {
            return Promise.reject(new InsightError(("More than one filter in WHERE")));
        }
    }

    private validQuery(query: any): boolean {
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
        } else {
            return true;
        }
        // maybe check if it is array?
    }

    private getDatasetById(id: string): any[] {
        let retval: any[] = [];
        fs.readdirSync("./data/").forEach((filename) => {
            // read file sync return array.
            if (id === filename) {
                const fileContent = fs.readFileSync("./data/" + filename, "utf8");
                let fileID = JSON.parse(fileContent).id; // REVIVER
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


    private performFilter(sections: object[], filter: object, id: string): object[] {

        let retval = Object.values(sections).filter((section) => {
            return this.isSatisfied(section, filter, id);
        });
        return retval;

    }

    private isSatisfied(section: any, filter: any, id: string): boolean {
        let helper = new PerformQueryHelper();
        let operationArr: any[] = Object.keys(filter);
        let filterArr: any[] = filter[operationArr[0]];
        if (operationArr.length === 0) {
            return true;
        } else if (operationArr.length > 1) {
            throw new InsightError("Number of filter key is greater than 1");
        } else {
            switch (operationArr[0]) {
                case "NOT":
                    return !this.isSatisfied(section, filter.NOT, id);

                case "AND": // TODO: check empty array
                    if (filterArr.length === 0) {
                        throw new InsightError("empty array");
                    }
                    let resultAND = true;
                    for (let obj of filter.AND) {
                        if (this.isSatisfied(section, obj, id) === false) {
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
                        if (this.isSatisfied(section, obj, id) === true) {
                            resultOR = true;
                        }
                    }
                    return resultOR;
                case "IS"  :
                    return helper.IScomparator(filter, section, id);
                case "LT":
                    return helper.LTcomparator(filter, section, id);
                case "GT":
                    return helper.GTcomparator(filter, section, id);
                case "EQ":
                    return helper.EQcomparator(filter, section, id);
                default:
                    throw new InsightError("Invalid comparator name");

            }
        }
    }
}
