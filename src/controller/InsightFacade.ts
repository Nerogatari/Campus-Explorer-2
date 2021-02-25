import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind} from "./IInsightFacade";
import { InsightError, NotFoundError } from "./IInsightFacade";
import * as JSZip from "jszip";
import { strict } from "assert";
import {readdir, readFileSync, readlinkSync, writeFileSync} from "fs-extra";
// import * as fse from "fs-extra";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
    private addedMap: Map<string, Map<string, string[]>>;

    constructor() {
        // this.addedMap = this.loadDiskDatasets();
        this.addedMap = new Map();
        Log.trace("InsightFacadeImpl::init()");
    }

    // }  https://stackoverflow.com/questions/47746760/js-how-to-solve-this-promise-thing
    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        let newZip = new JSZip();
        let dataSetMap: Map<string, string[]> = new Map();
        let fileName: string = "";
        let addedIds: string[] = [];
        // let str = this.parseCourseData("test", "tester");
        // Log.info(str);
        // return Promise.reject(new InsightError());
        // https://stackoverflow.com/questions/39322964/extracting-zipped-files-using-jszip-in-javascript
        // TODO figure out naming for keys, 2.do more validations for id/file format, 3.store kind 4.Skip sections w/ missing cats
        return newZip.loadAsync(content, { base64: true }).then((zip: any) => {
            let promisesArr = [Promise];
            zip.folder("courses").forEach(function (relativePath: any, file: any) {
                fileName = file.name.replace("courses/", "");
                Log.info(file.name);
                promisesArr.push(file.async("string"));
            });
            return Promise.all(promisesArr)
                .then((sectionData: any) => {
                    let tempArr = []; // does this content array return them all at once? TOASK how to loop
                    let tempString = ""; // how to properly get name??? Right now its all under same key.
                    // can put into array as for each and match but no guarantee of order by promise.all?
                    // Extract from naming convention in JSON but seems flawed
                    for (let i = 1; i < content.length; i++) {
                        tempString = this.parseCourseData(id, sectionData[i]);
                        tempArr.push(tempString);
                    }
                    dataSetMap.set(fileName, tempArr);
                    function replacer(key: any, value: any) {
                        if (value instanceof Map) {
                            return {
                                dataType: "Map",
                                value: Array.from(value.entries()),
                            };
                        } else {
                            return value;
                        }
                    }
                    const str = JSON.stringify(dataSetMap, replacer);
                    writeFileSync("./data/" + id + ".txt", str);
                    this.addedMap.set(id, dataSetMap);
                    addedIds.push(id);
                    Log.info(addedIds);
                    Log.info("Good push");
                });
        }).then(() => {
            Log.info("MORE SUCCESS");
            return addedIds;
        })
            .catch((err) => {
                Log.info(err);
                Log.info("UH oH");
                return Promise.reject(new InsightError());
            });
    }

    public removeDataset(id: string): Promise<string> {
    
        // if (this.validId(id) === false) {
        //     return Promise.reject(new InsightError());
        // }
        // if (!this.addedMap.has(id)) {
        //     return Promise.reject(new NotFoundError());
        // }

        // fs.removeSync()
        // use unlink for async TODO if running time too long
        // fse.unlinkSync("./data/" + id + ".txt");
        // this.addedMap.delete(id);
        // let res = id;
        return Promise.reject("Not implemented.");
    }

    public performQuery(query: any): Promise<any[]> {
        return Promise.reject("Not implemented.");
    }

    public listDatasets(): Promise<InsightDataset[]> {
        let emptyList: InsightDataset[] = [];
        return Promise.reject("Not implemented.");
    }

    // https://stackoverflow.com/questions/29085197/how-do-you-json-stringify-an-es6-map
    // function replacer(key: any, value: any) {
    //     if(value instanceof Map) {
    //       return {
    //         dataType: 'Map',
    //         value: Array.from(value.entries()), // or with spread: value: [...value]
    //       };
    //     } else {
    //       return value;
    //     }
    // }
    private reviver(key: any, value: any) {
        if (typeof value === "object" && value !== null) {
          if (value.dataType === "Map") {
            return new Map(value.value);
          }
        }
        return value;
      }

    private validId(id: string): boolean {
        // https://stackoverflow.com/questions/2031085/how-can-i-check-if-string-contains-characters-whitespace-not-just-whitespace/6610847
        if ((/\S/.test(id)) || (id.includes("_"))) {
            // (this.addedMap.has(id)
            return false;
            // string is not empty and not just whitespace, need to add more checks here
        } else {
            return true;
        }
    }
    // https://stackoverflow.com/questions/10049557/reading-all-files-in-a-directory-store-them-in-objects-and-send-the-object
    private loadDiskDatasets() {
        let resMap = new Map();
        function reviver(key: any, value: any) {
            if (typeof value === "object" && value !== null) {
              if (value.dataType === "Map") {
                return new Map(value.value);
              }
            }
            return value;
          }
        readdir("./data/", function (err: any, filenames: any) {
            if (err) {
                Log.info("Failed directory read");
                return;
            }
            filenames.forEach(function (filename: any) {
                let data = readlinkSync(filename);
                let name = filename.name.replace("courses/", "");
                const newMapValue = JSON.parse(data, this.reviver());
                resMap.set(name, newMapValue);
            });
        });
        return resMap;
    }
    // https://stackoverflow.com/questions/20059995/how-to-create-an-object-from-an-array-of-key-value-pairs/43682482
    private parseCourseData(id: string, content: string): string {
        // Object.fromEntries = arr => Object.assign({}, ...Array.from(arr, ([k, v]) => ({[k]: v}) ));
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
        // what to do with result/rank? do we keep it?
        // let dummy = '{"result":[{"tier_eighty_five":32,"tier_ninety":3,"Title":"intr sftwr eng","Section":"overall","Detail":"","tier_seventy_two":26,"Other":1,"Low":53,"tier_sixty_four":2,"id":1293,"tier_sixty_eight":14,"tier_zero":0,"tier_seventy_six":36,"tier_thirty":0,"tier_fifty":1,"Professor":"palyart-lamarche, marc","Audit":0,"tier_g_fifty":0,"tier_forty":0,"Withdrew":2,"Year":"2014","tier_twenty":0,"Stddev":6.78,"Enrolled":160,"tier_fifty_five":0,"tier_eighty":38,"tier_sixty":4,"tier_ten":0,"High":94,"Course":"310","Session":"w","Pass":156,"Fail":0,"Avg":78.69,"Campus":"ubc","Subject":"cpsc"}], "rank": 0}';
        let jsonObj = JSON.parse(content);
        let newYearKey = "";
        let newJSONArr: any = [];
        jsonObj.result.forEach((ele: any) => {
            let newJSON: any = {};
            let sectionOverall: boolean = false;
            Object.keys(ele).forEach((key) => {
                if (courseKeys.indexOf(key) !== -1) {
                    Log.info(key);
                    if (key === "Section") {
                        Log.info(ele[key]);
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
                if (sectionOverall) {
                    newJSON[newYearKey] = 1900;
                }
            });
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
    // what happens if string can't be converted to num -> insight error?
    private enforceTypes(key: string, val: any): any {
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
}
