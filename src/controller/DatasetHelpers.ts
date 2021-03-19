export default class DatasetHelper {
    public validateSections(data: any, keys: string[]): boolean {
        // has all needed categories TODO TEST
        let bool: boolean = true;
        for (const key of keys) {
            if (!data.hasOwnProperty(key)) {
                return bool = false;
            }
        }
        return bool;
    }

    // what happens if string can't be converted to num -> insight error? TODO, TOASK
    public enforceTypes(key: string, val: any): any {
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

    public convertKeysWithId(id: string, key: string): string {
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

    public validId(id: string): boolean {
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
    // https://stackoverflow.com/questions/54905976/how-do-i-filter-keys-from-json-in-node-js
    // https://stackoverflow.com/questions/20059995/how-to-create-an-object-from-an-array-of-key-value-pairs/43682482

    public parseCourseData(id: string, content: string): any[] {
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
}
