import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind} from "./IInsightFacade";
import { InsightError, NotFoundError } from "./IInsightFacade";
import * as JSZip from "jszip";
import { strict, throws } from "assert";
import {readdir, readFileSync, readlinkSync, unlinkSync, writeFileSync} from "fs-extra";
// import * as fse from "fs-extra";
export default class InsightFacade implements IInsightFacade {
    private addedMapsArr: any[];
    constructor() {
        this.addedMapsArr = [];
        this.loadDiskDatasets();
        Log.trace("InsightFacadeImpl::init()");
    }
    // https://stackoverflow.com/questions/47746760/js-how-to-solve-this-promise-thing
    // https://stuk.github.io/jszip/documentation/examples.html
    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        let newZip = new JSZip();
        let dataSetArray: string[] = [];
        let fileName: string = "";
        let addedIds: string[] = [];
        if (kind === InsightDatasetKind.Rooms) {
            return Promise.reject(new InsightError("Invalid Kind"));
        }
        if (this.validId(id) === false) {
            return Promise.reject(new InsightError("Invalid ID"));
        }
        if (this.existingDatasetID(id) === true) {
            return Promise.reject(new InsightError("Existing ID"));
        }
        // https://stackoverflow.com/questions/39322964/extracting-zipped-files-using-jszip-in-javascript
        return newZip.loadAsync(content, { base64: true }).then((zip: any) => {
            let promisesArr: Array<Promise<string>> = [];
            zip.folder("courses").forEach(function (relativePath: any, file: any) {
                fileName = file.name.replace("courses/", "");
                if (fileName === ".DS_Store") {
                    return;
                }
                promisesArr.push(file.async("string"));
            });
            return Promise.all(promisesArr)
                .then((sectionData: any) => {
                    let tempArr = [];
                    for (const section of sectionData) {
                        tempArr = this.parseCourseData(id, section);
                        dataSetArray.push(...tempArr);
                    }
                    if (dataSetArray.length === 0) {
                        return Promise.reject(new InsightError("No valid sections in file"));
                    }
                    let newObj: any = {id: id, kind: kind, data: dataSetArray};
                    const str = JSON.stringify(newObj);
                    writeFileSync("./data/" + id + ".txt", str);
                    this.addedMapsArr.push(newObj);
                    Log.info("Good push"); // return something
                });
        }).then(() => {
            Log.info("MORE SUCCESS");
            this.addedMapsArr.forEach((ele: any) => {
                addedIds.push(ele.id);
            });
            return addedIds;
        })
            .catch((err) => {
                Log.info("UH oH");
                return Promise.reject(new InsightError(err));
            });
    }

    public removeDataset(id: string): Promise<string> {
        let removedId = "";
        if (this.validId(id) === false) {
            return Promise.reject(new InsightError("Invalid ID"));
        }
        if (this.existingDatasetID(id) === false) {
            return Promise.reject(new NotFoundError("ID not loaded"));
        }
        for (let i = 0; i < this.addedMapsArr.length; i++) {
            if (this.addedMapsArr[i].id === id) {
                this.addedMapsArr.splice(i, 1);
                let bool = this.existingDatasetID(id);
                removedId = id;
            }
        }
        unlinkSync("./data/" + id + ".txt");
        return Promise.resolve(removedId);
        // use unlink for async TODO if running time too long
        // fse.unlinkSync("./data/" + id + ".txt");
    }

    public performQuery(query: any): Promise<any[]> {
        return Promise.reject("Not implemented.");
    }

    public listDatasets(): Promise<InsightDataset[]> {
        let emptyList: InsightDataset[] = [];
        for (const ele of this.addedMapsArr) {
            let obj: InsightDataset = {
                id: ele.id, kind: ele.kind, numRows: ele.data.length
            };
            emptyList.push(obj);
        }
        return Promise.resolve(emptyList);
    }

    private validId(id: string): boolean {
        // TODO TEST regex more
        // https://stackoverflow.com/questions/2031085/
        // how-can-i-check-if-string-contains-characters-whitespace-not-just-whitespace/6610847
        if ((id === null) || (id === undefined) || (!/\S/.test(id)) ||
            (id.includes("_") || (!/^[^_]+$/.test(id)))) {
            return false;
            // string is not empty and not just whitespace, need to add more checks here
        } else {
            return true;
        }
    }

    private existingDatasetID(id: string): boolean {
        // let test = [];
        // let obj1 = {
        //     id: "courses",
        //     kind: "courses",
        //     data: ['hello']
        // }
        // let obj2 = {
        //     id: "kevin",
        //     kind: "courses",
        //     data: ['not today']
        // }
        // test.push(obj1);
        // test.push(obj2);
        let bool: boolean = false;
        bool = this.addedMapsArr.some((ele) => {
            return ele.id === id;
        });
        return bool;
    }
    // https://medium.com/stackfame/get-list-of-all-files-in-a-directory-in-node-js-befd31677ec5
    private loadDiskDatasets = () => {
        readdir("./data/", (err: any, filenames: any)  => {
            if (err) {
                Log.info("Failed directory read");
                return;
            }
            filenames.forEach( (filename: any) => {
                if (filename === ".DS_Store") {
                    return;
                }
                let data = JSON.parse(readFileSync("./data/" + filename).toString());
                if (this.existingDatasetID(data.id) === true) {
                    Log.info("Skipped loading id:" + data.id + ", due to already existing id");
                    return;
                }
                this.addedMapsArr.push(data);
            });
        });
    }
    // https://stackoverflow.com/questions/54905976/how-do-i-filter-keys-from-json-in-node-js
    // https://stackoverflow.com/questions/20059995/how-to-create-an-object-from-an-array-of-key-value-pairs/43682482
    private parseCourseData(id: string, content: string): any[] {
        // how to check if all course keys needed are in the json, length?
        const courseKeys = [
            "Subject", // CPSC
            "Section",
            "Professor",
            "Audit",
            "Year",
            "Course", // 310
            "Title",
            "Pass",
            "Fail",
            "Avg",
            "id"
        ];
        let jsonObj = JSON.parse(content);
        let newYearKey = "";
        let newJSONArr: any = [];
        jsonObj.result.forEach((ele: any) => {
            let newJSON: any = {};
            let sectionOverall: boolean = false;
            Log.info(this.validateSections(ele, courseKeys));
            if (this.validateSections(ele, courseKeys) === false) {
                return;
            }
            Object.keys(ele).forEach((key) => {
                if (courseKeys.indexOf(key) !== -1) {
                    if (key === "Section") {
                        if (ele[key] === "overall") {
                            sectionOverall = true;
                        }
                        return;
                    }
                    let newKey = this.convertKeysWithId(id, key);
                    if (key === "Year") {
                        newYearKey = newKey;
                    }
                    let newVal = this.enforceTypes(key, ele[key]);
                    newJSON[newKey] = newVal;
                }
            });
            if (sectionOverall) {
                newJSON[newYearKey] = 1900;
            }
            newJSONArr.push(newJSON);
        });
        return newJSONArr;
    }
    private convertKeysWithId(id: string, key: string): string {
        let newKey = "";
        switch (key) {
            case "Subject":
                newKey = "dept";
                break;
            case "Course":
                newKey = "id";
                break;
            case "Avg":
                newKey = "avg";
                break;
            case "Professor":
                newKey = "instructor";
                break;
            case "Title":
                newKey = "title";
                break;
            case "Pass":
                newKey = "pass";
                break;
            case "Fail":
                newKey = "fail";
                break;
            case "Audit":
                newKey = "audit";
                break;
            case "id":
                newKey = "uuid";
                break;
            case "Year":
                newKey = "year";
        }
        return id + "_" + newKey;
    }
    // what happens if string can't be converted to num -> insight error? TODO, TOASK
    private enforceTypes(key: string, val: any): any {
        // try catch and skip erroneous converts
        let newVal: any;
        switch (key) {
            case "Avg":
            case "Pass":
            case "Fail":
            case "Audit":
            case "Year":
                newVal = Number(val);
                break;
            case "Subject":
            case "id":
            case "Professor":
            case "Course":
            case "Title":
                newVal = String(val);
        }
        return newVal;
    }

    private validateSections(data: any, keys: string[]): boolean {
        // has all needed categories TODO TEST
        let bool: boolean = true;
        for (const key of keys) {
            if (!data.hasOwnProperty(key)) {
                return bool = false;
            }
        }
        return bool;
    }
}
