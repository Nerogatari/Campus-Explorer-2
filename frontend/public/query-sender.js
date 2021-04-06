/**
 * Receives a query object as parameter and sends it as Ajax request to the POST /query REST endpoint.
 *
 * @param query The query object
 * @returns {Promise} Promise that must be fulfilled if the Ajax request is successful and be rejected otherwise.
 */
CampusExplorer.sendQuery = (query) => {
    return new Promise((resolve, reject) => {
        const http = new XMLHttpRequest();
        http.open("POST","/query", true);
        http.setRequestHeader("Content-Type", "application/json");
        http.send(JSON.stringify(query));
        http.onload = function () {
            if (this.readyState === 4 && this.status === 200) {
                resolve(JSON.parse(http.responseText));
            } else {
                reject(JSON.parse(http.responseText));
            }
        }
    });
};
