import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind} from "./IInsightFacade";
import {InsightError, NotFoundError} from "./IInsightFacade";
import * as fs from "fs";

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

        Log.trace(query);
        // check query missing where, missing options, more than 2 fields
        let filter = query.WHERE;
        let options = query.OPTIONS;
        let datasetID = "courses"; // TODO get id from dataset

        // check filter, options' structure

        // get dataset by id--use fs.readFileSync
        let sections = this.getDatasetById(datasetID); // let section store dataset id
        let filteredSections = []; // applied filter sections

        if (!Object.keys(filter)) {
            filteredSections = sections;
        } else if (Object.keys(filter).length === 1) {
            // pass dataset and filter and return sections
            filteredSections = this.performFilter(sections, filter, datasetID);
        } else {
            return Promise.reject(new InsightError(("More than one filter in WHERE")));
        }

        return Promise.resolve(filteredSections);
    }

    private getDatasetById (id: string): any[] {
        let retval: any[] = [];
        fs.readdirSync("./data/").forEach((filename) => {
            // read file sync return array.
            if (id === filename) {
                const fileContent = fs.readFileSync("./data/" + filename, "utf8");
                retval = JSON.parse(fileContent)["data"];
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
            (this.isSatisfied(filter, section, id));
        });

        return retval;

    }

    private isSatisfied(filter: any, section: any, id: string) {

        let result = false;
        let operationArr = Object.keys(filter);
        if (operationArr.length !== 1) {
            throw new InsightError("Number of filter key is not 1");
        } else {
            switch (operationArr[0]) {
                case "NOT":

                case "AND":
                    let resultAND = true;
                    for (let obj of filter.AND) {
                        if (this.isSatisfied(obj, section, id) === false) {
                            resultAND = false;
                        }
                    }
                    return resultAND;
                case "OR":
                    let resultOR = false;
                    for (let obj of filter.OR) {
                        if (this.isSatisfied(obj, section, id) === true) {
                            resultOR = true;
                        }
                    }
                    return resultOR;
                case "IS":
                    return this.mcomparator(filter, section, id);
                case "LT":
                    return this.mcomparator(filter, section, id);
                case "GT":
                    return this.mcomparator(filter, section, id);
                case "EQ":
                    return this.mcomparator(filter, section, id);

            }
        }
    }

    private mcomparator(filter: any, section: any, id: string) {
        return false;
    }
}
