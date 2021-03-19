import {InsightDatasetKind, InsightError} from "./IInsightFacade";
import PerformQueryHelper from "./performQueryHelper";

export function performFilter(sections: object[], filter: object, id: string, dataKind: InsightDatasetKind): object[] {

    let retval = sections.filter((section) => {
        return this.isSatisfied(section, filter, id, dataKind);
    });
    return retval;
}
export function isSatisfied(section: any, filter: any, id: string, dataKind: InsightDatasetKind): boolean {
    let helper = new PerformQueryHelper();
    let operationArr: any[] = Object.keys(filter);
    let filterArr: any[] = filter[operationArr[0]];
    if (operationArr.length === 0) {
        return true;
        // throw new InsightError("Number of filter key should  not be 0");
    } else if (operationArr.length > 1) {
        throw new InsightError("Number of filter key is greater than 1");
    } else {
        switch (operationArr[0]) {
            case "NOT":
                return !this.isSatisfied(section, filter.NOT, id, dataKind);
            case "AND": // TODO: check empty array
                if (filterArr.length === 0 || filter.AND === 0 || !Array.isArray(filter.AND))  {
                    throw new InsightError("empty array");
                }
                let resultAND = true;
                for (let obj of filter.AND) {
                    if (this.isSatisfied(section, obj, id, dataKind) === false) {
                        resultAND = false;
                    }
                }
                return resultAND;
            case "OR":
                if (filterArr.length === 0 || filter.OR === 0 || !Array.isArray(filter.OR)) {
                    throw new InsightError("empty array");
                }
                let resultOR = false;
                for (let obj of filter.OR) {
                    if (this.isSatisfied(section, obj, id, dataKind) === true) {
                        resultOR = true;
                    }
                }
                return resultOR;
            case "IS"  :
                return helper.IScomparator(filter, section, id, dataKind);
            case "LT":
                return helper.LTcomparator(filter, section, id, dataKind);
            case "GT":
                return helper.GTcomparator(filter, section, id, dataKind);
            case "EQ":
                return helper.EQcomparator(filter, section, id, dataKind);
            default:
                throw new InsightError("Invalid comparator name");

        }
    }
}
