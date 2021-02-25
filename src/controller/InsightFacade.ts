import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind} from "./IInsightFacade";
import { InsightError, NotFoundError } from "./IInsightFacade";
import * as JSZip from "jszip";
import { strict } from "assert";
import {readdir, readFileSync, readlinkSync, writeFileSync} from 'fs-extra';
// import * as fse from "fs-extra";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
    private addedMap: Map<string, string>;

    constructor() {
        // function reviver(key: any, value: any) {
        //     if(typeof value === 'object' && value !== null) {
        //       if (value.dataType === 'Map') {
        //         return new Map(value.value);
        //       }
        //     }
        //     return value;
        // }
        // this.addedMap = this.loadDiskDatasets();
        this.addedMap = new Map();
        Log.trace("InsightFacadeImpl::init()");
    }

    // }  https://stackoverflow.com/questions/47746760/js-how-to-solve-this-promise-thing
    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        let newZip = new JSZip();
        let dataSetMap = new Map();
        let fileName: string;
        // this.parseCourseData("test");
        // return Promise.reject(new InsightError());
        // https://stackoverflow.com/questions/39322964/extracting-zipped-files-using-jszip-in-javascript
        return newZip.loadAsync(content, { base64: true }).then(function (zip: any) {
            let promisesArr = [Promise];
            zip.folder("courses").forEach(function (relativePath: any, file: any) {
                fileName = file.name.replace("courses/", "");
                promisesArr.push(file.async("string"))
            });
            return Promise.all(promisesArr)              
                .then((content: any) => {
                    dataSetMap.set(fileName, content);
                    function replacer(key: any, value: any) {
                        if (value instanceof Map) {
                            return {
                                dataType: 'Map',
                                value: Array.from(value.entries()),
                            };
                        } else {
                            return value;
                        }
                    }
                    const str = JSON.stringify(dataSetMap, replacer);                  
                    // (node:4405) UnhandledPromiseRejectionWarning: TypeError: Cannot read property 'addedMap' of undefined
                    // at /Users/kevinhuang/Documents/project_team226/src/controller/InsightFacade.ts:131:26
                    //(Use `node --trace-warnings ...` to show where the warning was created)
                    // (node:4405) UnhandledPromiseRejectionWarning: Unhandled promise rejection. This error originated either by 
                    // throwing inside of an async function without a catch block, or by rejecting a promise which was not handled with .catch().
                    // To terminate the node process on unhandled promise rejection, use the CLI flag`--unhandled-rejections=strict`(see https://nodejs.org/api/cli.html#cli_unhandled_rejections_mode). (rejection id: 3)
                    // but data still writes to disk??
                    writeFileSync("./data/" + id + ".txt", str);        
                    this.addedMap.set(id, dataSetMap);
                    // Log.info(this.addedMap);
                    // let addedIds: Array<string> = Array.from(this.addedMap.keys());
                    // let addedIds: Array<string>;
                    // addedIds.push(id);
                    // let dupe = addedIds;
                    Log.info("SUCCESS");
                    return []; //diff between return the array vs Promise.resolve(arr)?
                });
        }).then(() => {
            Log.info("MORE SUCCESS")
            return ['1'];
        })
            .catch((err) => {
                Log.info(err);
                Log.info("UH oH")
            return Promise.reject(new InsightError());
        })
        // return Promise.reject(new InsightError()); //return Promise.resolve(addedIds);
    }

    public removeDataset(id: string): Promise<string> {
        
        // if (this.validId(id) === false) {
        //     return Promise.reject(new InsightError());
        // }
        // if (!this.addedMap.has(id)) {
        //     return Promise.reject(new NotFoundError());
        // }

        //fs.removeSync()
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
        if(typeof value === 'object' && value !== null) {
          if (value.dataType === 'Map') {
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
            if(typeof value === 'object' && value !== null) {
              if (value.dataType === 'Map') {
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
            })
        });
        return resMap;
    }
    // https://stackoverflow.com/questions/20059995/how-to-create-an-object-from-an-array-of-key-value-pairs/43682482
    parseCourseData(id: string, content: string): string {
        // Object.fromEntries = arr => Object.assign({}, ...Array.from(arr, ([k, v]) => ({[k]: v}) ));
        // how to check if all course keys needed are in the json, length?
        const courseKeys = [
            "Subject", // CPSC
            "Section",
            "Professor",
            "Audit",
            "Year",
            "Course", //310
            "Title",
            "Pass",
            "Fail",
            "Avg",
            "id"
        ]
        // what to do with result/rank? do we keep it?
        let dummy = '{"result":[{"tier_eighty_five":1,"tier_ninety":8,"Title":"rsrch methdlgy","Section":"002","Detail":"","tier_seventy_two":0,"Other":1,"Low":89,"tier_sixty_four":0,"id":31379,"tier_sixty_eight":0,"tier_zero":0,"tier_seventy_six":0,"tier_thirty":0,"tier_fifty":0,"Professor":"","Audit":9,"tier_g_fifty":0,"tier_forty":0,"Withdrew":1,"Year":"2015","tier_twenty":0,"Stddev":2.65,"Enrolled":20,"tier_fifty_five":0,"tier_eighty":0,"tier_sixty":0,"tier_ten":0,"High":98,"Course":"504","Session":"w","Pass":"9…gy", "Section": "overall", "Detail": "", "tier_seventy_two": 0, "Other": 1, "Low": 89, "tier_sixty_four": 0, "id": 31380, "tier_sixty_eight": 0, "tier_zero": 0, "tier_seventy_six": 0, "tier_thirty": 0, "tier_fifty": 0, "Professor": "", "Audit": 9, "tier_g_fifty": 0, "tier_forty": 0, "Withdrew": 1, "Year": "2015", "tier_twenty": 0, "Stddev": 2.65, "Enrolled": 20, "tier_fifty_five": 0, "tier_eighty": 0, "tier_sixty": 0, "tier_ten": 0, "High": 98, "Course": "504", "Session": "w", "Pass": 9, "Fail": 0, "Avg": 94.44, "Campus": "ubc", "Subject": "aanb"}], "rank": 0}';
        let obj = JSON.parse(dummy);
        let sectionOverall = false;
        let newYearKey = "";
        let newJSON = {
            // [key: String]: any //TOASKNEW2
        };
        Object.keys(obj.result[0]).forEach((key) => {
            if (courseKeys.indexOf(key) !== -1) {
                Log.info(key);
                if (key == "Section") {
                    if (obj.result[0][key] == "overall") {
                        sectionOverall = true;
                    }
                    return;
                }
                //let newKey = this.convertKeysWithId(id, key);
                // if (key == "Year") {
                //     newYearKey = newKey;
                // }
                // let newVal = this.enforceTypes(key, obj.result[0][key])
                // newJSON[key] = obj.result[0][key];
                //Element implicitly has an 'any' type because index expression is not of type 'number'.
            }
        })
        // This condition will always return 'false' since the types 'false' and 'true' have no overlap.ts(2367)
        // if (sectionOverall === true) {
        //     newJSON[newYearKey] = 1900;
        // }
        
        return "";
    }
    convertKeysWithId(id: string, key: string): string {
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
    //what happens if string can't be converted to num -> insight error?
    enforceTypes(key: string, val: any): any{
        let newVal;
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
