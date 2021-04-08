/**
 * Builds a query object using the current document object model (DOM).
 * Must use the browser's global document object {@link https://developer.mozilla.org/en-US/docs/Web/API/Document}
 * to read DOM information.
 *
 * @returns query object adhering to the query EBNF
 */
CampusExplorer.buildQuery = () => {
    let query = {};
    //get active panel= get dataset ID
    const datasetId = document.getElementsByClassName("tab-panel active")[0].getAttribute("data-type")
    let form = document.querySelector(`.tab-panel.active form`);

    // Condition=> WHERE
    query.WHERE = buildWHERE(datasetId, form)
    console.log(query)

    //Columns , Order =>OPTIONS
    let columns = buildCOLUMNS(datasetId, form)
    let order = buildORDER(datasetId, form)
    query.OPTIONS = buildOPTIONS(columns, order)
    console.log(columns)

    //GROUPS, TRANSFORMATION =>TRANSFORMATION
    let group = buildGROUP(datasetId, form)
    let apply = buildAPPLY(datasetId, form)
    if (group.length === 0 && apply.length === 0){
        return query
    }else {
        query.TRANSFORMATIONS = buildTRANSFORMATIONS(group, apply)
    }
    console.log("CampusExplorer.buildQuery not implemented yet.");
    return query;
};

function buildWHERE(datasetId, form) {
    const all = form.querySelector(".control.conditions-all-radio input").checked
    const any = form.querySelector(".control.conditions-any-radio input").checked
    const none = form.querySelector(".control.conditions-none-radio input").checked

    let conditions = buildCondition(datasetId, form)

    //check  cond size length = 0 / 1
    if (conditions.length === 0) {
        return {}
    } else if (conditions.length === 1) {
        if (none) {
            return {
                "NOT": conditions[0]
            }
        } else {
            return conditions[0]
        }
    }
    if (all) {
        return {
            "AND": conditions
        }
    } else if (any) {
        return {
            "OR": conditions
        }
    } else if (none) {
        return {
            "NOT": {
                "OR": conditions
            }
        }
    }
    return {}
}

function buildCondition(datasetId, form) {
    let conditions = form.querySelector(".conditions-container").children
    let retFilter = []
    for (let condition of conditions) {
        const not = condition.querySelector(".control.not input").checked
        const field = condition.querySelector(".control.fields [selected=\"selected\"]").value
        const key = datasetId + "_" + field
        const operator = condition.querySelector(".control.operators [selected=\"selected\"]").value
        let term = condition.querySelector(".control.term input").value || ""
        if (term !== "" && operator !== "IS") {
            term = Number(term)
        }
        let filter = {
            [operator]: {
                [key]: term
            }
        }
        if (not) {
            retFilter.push({
                "NOT": filter
            })
        } else {
            retFilter.push(filter)
        }

    }
    return retFilter;

}

function buildCOLUMNS(datasetId, form) {
    let columns = form.querySelector(".form-group.columns .control-group").children
    let retColumns =[]
    for (let column of columns) {
        let check = column.querySelector("input").checked
        if (column.className === "control field" && check) {
            retColumns.push(datasetId + "_" + column.querySelector("input").value)
        } else if (column.className === "control transformation" && check) {
            retColumns.push(column.querySelector("input").value)
        }
    }
    return retColumns

}

function buildORDER(datasetId, form){
    let orderKeys = form.querySelector(".control.order.fields select")
    let retOrderKeys = []
    let descending = form.querySelector(".control.descending input").checked
    for (let orderKey of orderKeys) {
        if (orderKey.className !== "transformation" && orderKey.selected) {
            retOrderKeys.push(datasetId + "_" + orderKey.value)
        } else if (orderKey.selected) {
            retOrderKeys.push(orderKey.value)
        }
    }
    // if (retOrderKeys.length === 1) {
    //     return retOrderKeys[0]
    // } else {
        if (descending) {
            return {
                // retOrderKeys may be empty
                "dir" : "DOWN",
                "keys": retOrderKeys
            }
        } else {
            return {
                "dir" : "UP",
                "keys":  retOrderKeys
            }
        }
    //
    // }
}
function buildOPTIONS(columns, order) {
    // if (typeof order ==="string") {
    //     return {
    //         "COLUMNS": columns,
    //         "ORDER": order
    //     }
    // } else {
        if (order.keys.length === 0) {
            return {
                "COLUMNS": columns
            }
        } else {
            return {
                "COLUMNS": columns,
                "ORDER": order
            }
        }
    // }
}
function buildGROUP(datasetId, form) {
    let groups = form.querySelector(".form-group.groups .control-group").children
    let retGroups =[]
    for (let group of groups) {
        let check = group.querySelector("input").checked
        if (check) {
            retGroups.push(datasetId + "_" + group.querySelector("input").value)
        }
    }
    return retGroups
}
function buildAPPLY(datasetId, form) {
    let applies = form.querySelector(".transformations-container").children
    let retApply = [];
    for (let apply of applies) {
        let operator = apply.querySelector(".control.operators [selected=\"selected\"]").value
        let term = apply.querySelector(".control.term input").value
        let fields = apply.querySelector(".control.fields [selected=\"selected\"]").value
        let app = {
            [term]: {
                [operator]: datasetId + "_" + fields
            }
        }
        retApply.push(app)
    }
    return retApply
}
function buildTRANSFORMATIONS(group, apply) {
    return {
        "GROUP": group,
        "APPLY": apply
    }
}
